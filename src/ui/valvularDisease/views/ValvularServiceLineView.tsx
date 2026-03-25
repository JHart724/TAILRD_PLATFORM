import React, { useState } from 'react';
import { Heart, Users, Calendar, Shield, Activity, Target, BarChart3, FileText, TrendingUp, Scissors, Workflow, AlertTriangle } from 'lucide-react';

// Import Valvular Disease components
import ValvePatientHeatmap from '../components/ValvePatientHeatmap';
import ValvularSurgicalNetworkVisualization from '../components/ValvularSurgicalNetworkVisualization';
import VDClinicalGapDetectionDashboard from '../components/clinical/VDClinicalGapDetectionDashboard';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';

type TabId = 'bicuspid' | 'ross' | 'repair-vs-replace' | 'echo-surveillance' | 'clinical-gap-detection' | 'heatmap' | 'network' | 'analytics' | 'outcomes' | 'quality' | 'reporting';

interface TabGroup {
  label: string;
  tabs: Array<{ id: string; label: string; icon: React.ElementType; description: string }>;
}

const ValvularServiceLineView: React.FC = () => {
  const [activeTab, _setActiveTab] = useState<TabId>('clinical-gap-detection');
  const setActiveTab = (tab: TabId) => {
    _setActiveTab(tab);
    const scrollContainer = document.querySelector('.overflow-y-auto.h-screen');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const tabGroups: TabGroup[] = [
    {
      label: 'Procedure Pathways',
      tabs: [
        { id: 'bicuspid', label: 'Bicuspid Repair', icon: Scissors, description: 'Bicuspid aortic valve repair pathway' },
        { id: 'ross', label: 'Ross Procedure', icon: Heart, description: 'Ross procedure tracking and outcomes' },
        { id: 'repair-vs-replace', label: 'Repair vs Replace', icon: Workflow, description: 'Decision support tool' },
        { id: 'echo-surveillance', label: 'Echo Surveillance', icon: Calendar, description: 'Echo surveillance scheduler' },
      ],
    },
    {
      label: 'Gap & Quality',
      tabs: [
        { id: 'clinical-gap-detection', label: 'Gap Detection (6-Gap)', icon: AlertTriangle, description: 'AI-driven clinical gap detection' },
        { id: 'quality', label: 'Quality', icon: Shield, description: 'Quality metrics and benchmarks' },
      ],
    },
    {
      label: 'Analytics & Reporting',
      tabs: [
        { id: 'heatmap', label: 'Patient Risk Heatmap', icon: Target, description: 'Valve patient risk visualization' },
        { id: 'network', label: 'Referral Network', icon: Users, description: 'Surgical referral patterns' },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Advanced valve analytics' },
        { id: 'outcomes', label: 'Outcomes', icon: TrendingUp, description: 'Surgical outcomes tracking' },
        { id: 'reporting', label: 'Automated Reports', icon: FileText, description: 'Automated reports and exports' },
      ],
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'heatmap':
        return <ValvePatientHeatmap />;
      case 'network':
        return <ValvularSurgicalNetworkVisualization />;
      case 'bicuspid':
        return (
          <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
              <Scissors className="w-8 h-8 text-porsche-600" />
              Bicuspid Aortic Valve Repair Pathway
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { stage: 'Assessment', patients: 156, rate: '100%', bgColor: 'bg-chrome-50', borderColor: 'border-chrome-200', textColor: 'text-chrome-600' },
                { stage: 'Suitable', patients: 98, rate: '62.8%', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-600' },
                { stage: 'Repair Planned', patients: 82, rate: '83.7%', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-600' },
                { stage: 'Completed', patients: 76, rate: '92.7%', bgColor: 'bg-gold-50', borderColor: 'border-gold-200', textColor: 'text-gold-600' }
              ].map((item, index) => (
                <div key={item.stage} className={`text-center p-6 rounded-xl ${item.bgColor} border ${item.borderColor}`}>
                  <div className={`text-3xl font-bold ${item.textColor} mb-2`}>{item.patients}</div>
                  <div className="font-semibold text-titanium-900">{item.stage}</div>
                  <div className={`text-sm ${item.textColor}`}>{item.rate}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Repair Suitability Criteria</h4>
                <div className="space-y-3">
                  {[
                    { criteria: 'Bicuspid morphology', suitable: 87, total: 156 },
                    { criteria: 'Adequate leaflet tissue', suitable: 92, total: 156 },
                    { criteria: 'Root dimensions <45mm', suitable: 78, total: 156 },
                    { criteria: 'No severe calcification', suitable: 134, total: 156 }
                  ].map((item, index) => (
                    <div key={item.criteria} className="flex items-center justify-between p-3 bg-chrome-50 rounded-lg">
                      <span className="text-titanium-900">{item.criteria}</span>
                      <div className="text-right">
                        <div className="font-semibold text-chrome-700">{item.suitable}/{item.total}</div>
                        <div className="text-xs text-chrome-600">{Math.round((item.suitable/item.total)*100)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Repair Outcomes</h4>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-titanium-900">Freedom from reoperation</span>
                    <span className="font-bold text-green-600">94.2% @ 5 yrs</span>
                  </div>
                  <div className="flex justify-between p-3 bg-chrome-50 rounded-lg">
                    <span className="text-titanium-900">Post-op AI grade \u2264 mild</span>
                    <span className="font-bold text-chrome-600">91.8%</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gold-50 rounded-lg">
                    <span className="text-titanium-900">Operative mortality</span>
                    <span className="font-bold text-gold-600">0.8%</span>
                  </div>
                  <div className="flex justify-between p-3 bg-amber-50 rounded-lg">
                    <span className="text-titanium-900">Mean gradient</span>
                    <span className="font-bold text-amber-600">8.2 mmHg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'ross':
        return (
          <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
              <Heart className="w-8 h-8 text-medical-red-600" />
              Ross Procedure Tracker
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { metric: 'Candidates Evaluated', value: 47, period: 'YTD' },
                { metric: 'Procedures Completed', value: 23, period: 'YTD' },
                { metric: 'Success Rate', value: '100%', period: 'Recent' }
              ].map((item, index) => (
                <div key={item.metric} className="text-center p-6 rounded-xl bg-red-50 border border-red-200">
                  <div className="text-3xl font-bold text-red-600 mb-2">{item.value}</div>
                  <div className="font-semibold text-titanium-900">{item.metric}</div>
                  <div className="text-sm text-red-600">{item.period}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Selection Criteria</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Age &lt;50 years</span><span className="text-green-600">{'\u2713'} Required</span></div>
                  <div className="flex justify-between"><span>Active lifestyle</span><span className="text-green-600">{'\u2713'} Required</span></div>
                  <div className="flex justify-between"><span>Normal PV anatomy</span><span className="text-green-600">{'\u2713'} Required</span></div>
                  <div className="flex justify-between"><span>No contraindications</span><span className="text-green-600">{'\u2713'} Required</span></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Long-term Outcomes</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>15-year survival</span><span className="font-medium">96.8%</span></div>
                  <div className="flex justify-between"><span>Freedom from AVR</span><span className="font-medium">89.2%</span></div>
                  <div className="flex justify-between"><span>Freedom from PVR</span><span className="font-medium">78.5%</span></div>
                  <div className="flex justify-between"><span>Endocarditis rate</span><span className="font-medium">0.5%/pt-yr</span></div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'repair-vs-replace':
        return (
          <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
              <Workflow className="w-8 h-8 text-medical-green-600" />
              Valve Repair vs Replacement Decision Tool
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-titanium-900">Decision Factors</h4>
                <div className="space-y-4">
                  {[
                    { factor: 'Patient Age', repair: '<65 years', replace: '>65 years', weight: 'High' },
                    { factor: 'Valve Anatomy', repair: 'Good leaflets', replace: 'Calcified/destroyed', weight: 'Critical' },
                    { factor: 'Surgeon Experience', repair: 'Experienced', replace: 'Standard', weight: 'Medium' },
                    { factor: 'Urgency', repair: 'Elective', replace: 'Urgent/Emergent', weight: 'Medium' }
                  ].map((item, index) => (
                    <div key={item.factor} className="bg-white p-4 rounded-xl border border-titanium-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-titanium-900">{item.factor}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.weight === 'Critical' ? 'bg-red-100 text-red-700' :
                          item.weight === 'High' ? 'bg-amber-100 text-amber-700' :
                          'bg-chrome-100 text-chrome-700'
                        }`}>
                          {item.weight}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <div className="text-green-700 font-medium">Repair</div>
                          <div className="text-green-600">{item.repair}</div>
                        </div>
                        <div className="p-2 bg-chrome-50 rounded-lg">
                          <div className="text-chrome-700 font-medium">Replace</div>
                          <div className="text-chrome-600">{item.replace}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-titanium-900">Outcomes Comparison</h4>
                <div className="bg-white p-6 rounded-xl border border-titanium-200">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-green-600 font-semibold mb-3">Repair</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Operative mortality</span>
                          <span className="font-medium">1.2%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>15-year survival</span>
                          <span className="font-medium">85.3%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Reoperation</span>
                          <span className="font-medium">8.7%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thromboembolism</span>
                          <span className="font-medium">0.8%/pt-yr</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-chrome-600 font-semibold mb-3">Replace</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Operative mortality</span>
                          <span className="font-medium">2.4%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>15-year survival</span>
                          <span className="font-medium">78.9%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Reoperation</span>
                          <span className="font-medium">12.3%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thromboembolism</span>
                          <span className="font-medium">1.9%/pt-yr</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'echo-surveillance':
        return (
          <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-medical-amber-600" />
              Echo Surveillance Scheduler
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { interval: 'Overdue', count: 23, bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-600' },
                { interval: 'Due This Month', count: 67, bgColor: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-600' },
                { interval: 'Due Next Month', count: 89, bgColor: 'bg-chrome-50', borderColor: 'border-chrome-200', textColor: 'text-chrome-600' },
                { interval: 'Future', count: 245, bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-600' }
              ].map((item, index) => (
                <div key={item.interval} className={`text-center p-6 rounded-xl ${item.bgColor} border ${item.borderColor}`}>
                  <div className={`text-3xl font-bold ${item.textColor} mb-2`}>{item.count}</div>
                  <div className="font-semibold text-titanium-900">{item.interval}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Surveillance Guidelines</h4>
                <div className="space-y-3">
                  {[
                    { severity: 'Mild AS/AI', interval: 'Every 3-5 years' },
                    { severity: 'Moderate AS/AI', interval: 'Every 1-2 years' },
                    { severity: 'Severe AS/AI', interval: 'Every 6 months' },
                    { severity: 'Post-repair', interval: 'Every 6-12 months' }
                  ].map((item, index) => (
                    <div key={item.severity} className="flex justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-titanium-900">{item.severity}</span>
                      <span className="font-medium text-amber-700">{item.interval}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Compliance Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-titanium-600">Overall compliance rate</span>
                    <span className="font-bold text-green-600">87.3%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-titanium-600">Avg delay (overdue cases)</span>
                    <span className="font-bold text-amber-600">4.2 months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-titanium-600">No-show rate</span>
                    <span className="font-bold text-red-600">12.1%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-titanium-600">Automatic reminders sent</span>
                    <span className="font-bold text-chrome-600">156 this month</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-porsche-600" />
                Valvular Disease Analytics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                  { label: 'Total Surgical Volume', value: '423', change: '+6.2%', bgColor: 'bg-chrome-50', borderColor: 'border-chrome-200', textColor: 'text-chrome-600' },
                  { label: 'Repair Rate', value: '62%', change: '+8.1%', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-600' },
                  { label: 'Ross Procedures', value: '23', change: '+4.5%', bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-600' },
                  { label: 'Echo Surveillance', value: '424', change: '+12.3%', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-600' }
                ].map((item, index) => (
                  <div key={item.label} className={`p-6 rounded-xl ${item.bgColor} border ${item.borderColor}`}>
                    <div className={`text-3xl font-bold ${item.textColor} mb-1`}>{item.value}</div>
                    <div className="font-medium text-titanium-900">{item.label}</div>
                    <div className="text-sm text-green-600 mt-1">{item.change} vs prior year</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-titanium-200">
                  <h4 className="font-semibold text-titanium-900 mb-4">Case Mix Distribution</h4>
                  <div className="space-y-3">
                    {[
                      { type: 'Aortic Valve Repair', count: 76, pct: '18.0%' },
                      { type: 'Aortic Valve Replacement', count: 134, pct: '31.7%' },
                      { type: 'Mitral Valve Repair', count: 89, pct: '21.0%' },
                      { type: 'Mitral Valve Replacement', count: 56, pct: '13.2%' },
                      { type: 'Ross Procedure', count: 23, pct: '5.4%' },
                      { type: 'Multi-Valve', count: 45, pct: '10.6%' }
                    ].map((item, index) => (
                      <div key={item.type} className="flex justify-between p-3 bg-porsche-50 rounded-lg">
                        <span className="text-titanium-800">{item.type}</span>
                        <span className="font-medium text-porsche-700">{item.count} ({item.pct})</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-titanium-200">
                  <h4 className="font-semibold text-titanium-900 mb-4">Quarterly Volume Trends</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { quarter: 'Q1 2025', repairs: 42, replacements: 56 },
                      { quarter: 'Q2 2025', repairs: 48, replacements: 52 },
                      { quarter: 'Q3 2025', repairs: 45, replacements: 54 },
                      { quarter: 'Q4 2025', repairs: 51, replacements: 50 }
                    ].map((q, index) => (
                      <div key={q.quarter} className="bg-porsche-50 p-4 rounded-xl text-center">
                        <div className="font-medium text-titanium-900 mb-2">{q.quarter}</div>
                        <div className="text-sm"><span className="text-green-600">Repair: {q.repairs}</span></div>
                        <div className="text-sm"><span className="text-chrome-600">Replace: {q.replacements}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'outcomes':
        return (
          <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              Surgical Outcomes Tracking
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { metric: 'Operative Mortality', value: '1.2%', benchmark: '<2.0%', met: true },
                { metric: 'Freedom from Reoperation (5yr)', value: '94.2%', benchmark: '>90%', met: true },
                { metric: 'Paravalvular Leak', value: '3.1%', benchmark: '<5.0%', met: true },
                { metric: '30-Day Readmission', value: '7.8%', benchmark: '<10%', met: true }
              ].map((item, index) => (
                <div key={item.metric} className={`p-6 rounded-xl ${item.met ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                  <div className="text-2xl font-bold text-titanium-900 mb-1">{item.value}</div>
                  <div className="font-medium text-titanium-800 text-sm">{item.metric}</div>
                  <div className={`text-xs mt-2 ${item.met ? 'text-green-600' : 'text-red-600'}`}>
                    Benchmark: {item.benchmark} {item.met ? '\u2713' : '\u2717'}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Repair Outcomes</h4>
                <div className="space-y-3">
                  {[
                    { metric: 'Repair success rate', value: '96.1%' },
                    { metric: 'Freedom from reoperation (5yr)', value: '94.2%' },
                    { metric: 'Post-op AI grade \u2264 mild', value: '91.8%' },
                    { metric: 'Mean gradient post-op', value: '8.2 mmHg' }
                  ].map((item, index) => (
                    <div key={item.metric} className="flex justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-titanium-900">{item.metric}</span>
                      <span className="font-bold text-green-600">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Replacement Outcomes</h4>
                <div className="space-y-3">
                  {[
                    { metric: 'Operative mortality', value: '1.8%' },
                    { metric: 'Structural valve degeneration (10yr)', value: '12.4%' },
                    { metric: 'Thromboembolism rate', value: '1.2%/pt-yr' },
                    { metric: 'Endocarditis rate', value: '0.6%/pt-yr' }
                  ].map((item, index) => (
                    <div key={item.metric} className="flex justify-between p-3 bg-chrome-50 rounded-lg">
                      <span className="text-titanium-900">{item.metric}</span>
                      <span className="font-bold text-chrome-600">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'quality':
        return (
          <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
              <Shield className="w-8 h-8 text-porsche-600" />
              Quality Benchmarks
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">STS Quality Metrics</h4>
                <div className="space-y-3">
                  {[
                    { metric: 'Observed/Expected Mortality', value: '0.72', percentile: '92nd', status: 'Excellent' },
                    { metric: 'Composite Quality Score', value: '96.4%', percentile: '88th', status: 'Excellent' },
                    { metric: 'Blood Product Utilization', value: '24.1%', percentile: '78th', status: 'Good' },
                    { metric: 'Prolonged Ventilation', value: '6.8%', percentile: '85th', status: 'Excellent' },
                    { metric: 'Deep Sternal Wound Infection', value: '0.3%', percentile: '91st', status: 'Excellent' }
                  ].map((item, index) => (
                    <div key={item.metric} className="flex items-center justify-between p-3 bg-porsche-50 rounded-lg">
                      <span className="text-titanium-800 text-sm">{item.metric}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-titanium-900">{item.value}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.status === 'Excellent' ? 'bg-green-100 text-green-700' : 'bg-chrome-100 text-chrome-700'
                        }`}>{item.percentile}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Process Metrics</h4>
                <div className="space-y-3">
                  {[
                    { metric: 'Echo within 30 days pre-op', value: '98.2%', target: '>95%' },
                    { metric: 'Anticoagulation protocol adherence', value: '96.8%', target: '>95%' },
                    { metric: 'Heart team discussion documented', value: '94.5%', target: '>90%' },
                    { metric: 'Follow-up echo within 30 days', value: '91.2%', target: '>85%' },
                    { metric: 'Discharge on appropriate therapy', value: '97.6%', target: '>95%' }
                  ].map((item, index) => (
                    <div key={item.metric} className="flex items-center justify-between p-3 bg-chrome-50 rounded-lg">
                      <span className="text-titanium-800 text-sm">{item.metric}</span>
                      <div className="text-right">
                        <div className="font-medium text-titanium-900">{item.value}</div>
                        <div className="text-xs text-titanium-500">Target: {item.target}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'reporting':
        return <AutomatedReportingSystem />;
      case 'clinical-gap-detection':
        return (
          <VDClinicalGapDetectionDashboard />
        );
      default:
        return <ValvePatientHeatmap />;
    }
  };

  return (
    <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>

      <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
        {/* Tab Navigation — Grouped */}
        <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-xl">
          {tabGroups.map((group, groupIdx) => (
            <div key={group.label}>
              {/* Section Divider */}
              {groupIdx > 0 && <div className="border-t border-titanium-100 my-4" />}
              <div className="mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-titanium-400">{group.label}</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3 mb-2">
                {group.tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabId)}
                      className={`group relative p-4 rounded-xl border transition-all duration-300 ${
                        isActive
                          ? 'bg-porsche-50 border-porsche-200 text-porsche-600 shadow-lg scale-105'
                          : 'bg-white border-titanium-200 text-titanium-600 hover:bg-white hover:scale-105 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Icon className={`w-6 h-6 ${isActive ? 'text-porsche-600' : 'text-titanium-600 group-hover:text-titanium-800'}`} />
                        <span className={`text-xs font-semibold text-center leading-tight ${isActive ? 'text-porsche-600' : 'text-titanium-600 group-hover:text-titanium-800'}`}>
                          {tab.label}
                        </span>
                      </div>
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-porsche-400 to-porsche-500 rounded-xl opacity-50" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default ValvularServiceLineView;
