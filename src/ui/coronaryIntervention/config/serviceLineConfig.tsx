import React, { useState } from 'react';
import { Activity, Network, Target, Users, Calculator, Shield, BarChart3, Award, Grid3X3, FileText, Heart, Zap, AlertTriangle, ChevronDown, ChevronUp, TrendingUp, Clock } from 'lucide-react';
import { ServiceLineViewConfig } from '../../../components/shared/BaseServiceLineView';
import { ServiceLineTabConfig } from '../../../components/shared/StandardInterfaces';
import { ExportData } from '../../../utils/dataExport';
import { formatDollar } from '../../../utils/predictiveCalculators';

// Import existing Coronary Service Line components
import PCINetworkVisualization from '../components/PCINetworkVisualization';
import GRACEScoreCalculator from '../components/GRACEScoreCalculator';
import TIMIScoreCalculator from '../components/TIMIScoreCalculator';
import SYNTAXScoreCalculator from '../components/SYNTAXScoreCalculator';
import CoronarySafetyScreening from '../components/CoronarySafetyScreening';

// Import shared components
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';
import CADClinicalGapDetectionDashboard, { CAD_CLINICAL_GAPS, CADGapPatient } from '../components/clinical/CADClinicalGapDetectionDashboard';
import SAQOutcomesPanel from '../components/service-line/SAQOutcomesPanel';
import { estimateSYNTAX } from '../../../utils/clinicalCalculators';

// Coronary Intervention Analytics Dashboard
const CoronaryInterventionAnalytics: React.FC = () => (
  <div className="space-y-6">
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">PCI Procedures</h4>
 <div className="text-2xl font-bold text-titanium-900">2,847</div>
 <div className="text-sm text-green-600">+8.4% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">CABG Procedures</h4>
 <div className="text-2xl font-bold text-titanium-900">456</div>
 <div className="text-sm text-green-600">+3.2% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">Primary PCI (STEMI)</h4>
 <div className="text-2xl font-bold text-titanium-900">387</div>
 <div className="text-sm text-green-600">+12.1% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">Complex PCI</h4>
 <div className="text-2xl font-bold text-titanium-900">892</div>
 <div className="text-sm text-green-600">+15.7% vs last quarter</div>
 </div>
 </div>
 <div className="metal-card p-8">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Target className="w-5 h-5 text-porsche-600" />
 Procedure Analytics
 </h3>
 <p className="text-titanium-600 mb-6">Comprehensive analytics for PCI and CABG procedures including lesion complexity assessment, device utilization, SYNTAX scoring, and operator performance metrics.</p>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="bg-white border border-porsche-200 rounded-lg p-5">
   <h4 className="text-sm font-bold text-titanium-900 mb-3">PCI Outcomes</h4>
   <div className="divide-y divide-titanium-100">
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">Overall PCI Success</span><span className="text-sm font-semibold text-titanium-900">97.7%</span></div>
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">D2B Time</span><span className="text-sm font-semibold text-titanium-900">78 min</span></div>
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">CTO Success</span><span className="text-sm font-semibold text-titanium-900">88.2%</span></div>
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">Complex PCI (B2/C) Rate</span><span className="text-sm font-semibold text-titanium-900">31.3%</span></div>
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">Radial Access</span><span className="text-sm font-semibold text-titanium-900">89.4%</span></div>
   </div>
 </div>
 <div className="bg-white border border-porsche-200 rounded-lg p-5">
   <h4 className="text-sm font-bold text-titanium-900 mb-3">CABG Outcomes</h4>
   <div className="divide-y divide-titanium-100">
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">Operative Mortality</span><span className="text-sm font-semibold text-titanium-900">1.2%</span></div>
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">Bilateral IMA Rate</span><span className="text-sm font-semibold text-titanium-900">42.1%</span></div>
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">Conversion to On-pump</span><span className="text-sm font-semibold text-titanium-900">8.4%</span></div>
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">Avg LOS</span><span className="text-sm font-semibold text-titanium-900">5.2d</span></div>
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">30-day Readmission</span><span className="text-sm font-semibold text-titanium-900">6.1%</span></div>
   </div>
 </div>
 <div className="bg-white border border-porsche-200 rounded-lg p-5">
   <h4 className="text-sm font-bold text-titanium-900 mb-3">STEMI Performance</h4>
   <div className="divide-y divide-titanium-100">
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">{'D2B < 90min'}</span><span className="text-sm font-semibold text-titanium-900">94.7%</span></div>
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">{'Transfer D2B < 120min'}</span><span className="text-sm font-semibold text-titanium-900">87.3%</span></div>
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">Median D2B</span><span className="text-sm font-semibold text-titanium-900">67 min</span></div>
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">Primary PCI Rate</span><span className="text-sm font-semibold text-titanium-900">98.2%</span></div>
     <div className="flex justify-between py-2"><span className="text-sm text-titanium-600">STEMI Mortality</span><span className="text-sm font-semibold text-titanium-900">4.3%</span></div>
   </div>
 </div>
 </div>
 </div>
  </div>
);

// Provider Performance Scorecard
const CoronaryProviderScorecard: React.FC = () => {
  const providers = [
    { name: 'Dr. Michael Chen', specialty: 'Interventional Cardiologist', pci: 287, cabg: 0, successRate: '98.2%', complications: '2.1%', quality: 96.8 },
    { name: 'Dr. Sarah Rodriguez', specialty: 'Cardiac Surgeon', pci: 0, cabg: 156, successRate: '97.4%', complications: '3.2%', quality: 95.1 },
    { name: 'Dr. James Wilson', specialty: 'Interventional Cardiologist', pci: 312, cabg: 0, successRate: '97.8%', complications: '1.9%', quality: 97.2 },
    { name: 'Dr. Lisa Thompson', specialty: 'Interventional Cardiologist', pci: 198, cabg: 0, successRate: '98.5%', complications: '1.6%', quality: 98.1 },
    { name: 'Dr. Robert Kim', specialty: 'Cardiac Surgeon', pci: 0, cabg: 134, successRate: '96.9%', complications: '3.8%', quality: 94.7 },
    { name: 'Dr. Amanda Foster', specialty: 'Interventional Cardiologist', pci: 223, cabg: 0, successRate: '97.1%', complications: '2.4%', quality: 96.3 },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-porsche-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Total Providers</p><p className="text-3xl font-bold text-titanium-900">6</p><p className="text-xs text-titanium-500 mt-1">Interventional cardiologists &amp; cardiac surgeons</p></div>
        <div className="metal-card p-5 border-l-4 border-l-green-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Avg Success Rate</p><p className="text-3xl font-bold text-green-700">97.7%</p><p className="text-xs text-titanium-500 mt-1">Across all coronary procedures</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Total Procedures</p><p className="text-3xl font-bold text-blue-700">1,310</p><p className="text-xs text-titanium-500 mt-1">PCI + CABG this quarter</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-porsche-600" />
          <h3 className="text-base font-semibold text-titanium-900">Provider Performance Scorecard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-titanium-50">
              <tr>{['Provider', 'Specialty', 'PCI Vol.', 'CABG Vol.', 'Success Rate', 'Complication Rate', 'Quality Score'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-titanium-100">
              {providers.map((p, i) => (
                <tr key={i} className="hover:bg-titanium-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-titanium-900">{p.name}</td>
                  <td className="px-4 py-3 text-titanium-600">{p.specialty}</td>
                  <td className="px-4 py-3 text-center font-mono">{p.pci > 0 ? p.pci : '—'}</td>
                  <td className="px-4 py-3 text-center font-mono">{p.cabg > 0 ? p.cabg : '—'}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{p.successRate}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">{p.complications}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-titanium-100 rounded-full h-2"><div className="bg-porsche-500 h-2 rounded-full" style={{ width: `${p.quality}%` }} /></div>
                      <span className="text-xs font-semibold text-titanium-700">{p.quality}</span>
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

// Combined Risk Calculators
const CoronaryRiskCalculators: React.FC = () => (
  <div className="space-y-8">
    <GRACEScoreCalculator />
    <TIMIScoreCalculator />
    <SYNTAXScoreCalculator />
  </div>
);

// PCI Procedure Analytics
const PCIProcedureAnalytics: React.FC = () => {
  const procedures = [
    { type: 'Simple PCI (Type A/B1)', volume: 1243, success: '99.1%', complications: '0.8%', avgLos: '1.2d', cost: '$18,450' },
    { type: 'Complex PCI (Type B2/C)', volume: 892, success: '97.4%', complications: '2.3%', avgLos: '2.1d', cost: '$28,900' },
    { type: 'CTO PCI', volume: 187, success: '88.2%', complications: '4.1%', avgLos: '3.4d', cost: '$52,300' },
    { type: 'Bifurcation PCI', volume: 312, success: '96.8%', complications: '2.8%', avgLos: '2.3d', cost: '$32,100' },
    { type: 'Left Main PCI', volume: 143, success: '97.2%', complications: '3.2%', avgLos: '2.8d', cost: '$45,600' },
    { type: 'Rotational Atherectomy', volume: 70, success: '94.3%', complications: '5.7%', avgLos: '3.1d', cost: '$41,200' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-porsche-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Total PCI Volume</p><p className="text-3xl font-bold text-titanium-900">2,847</p><p className="text-xs text-green-600 mt-1">+8.4% vs last quarter</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Complex PCI Rate</p><p className="text-3xl font-bold text-blue-700">31.3%</p><p className="text-xs text-titanium-500 mt-1">B2/C lesion complexity</p></div>
        <div className="metal-card p-5 border-l-4 border-l-green-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Overall Success Rate</p><p className="text-3xl font-bold text-green-700">97.8%</p><p className="text-xs text-titanium-500 mt-1">Technical procedural success</p></div>
        <div className="metal-card p-5 border-l-4 border-l-slate-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">IVUS/OCT Use Rate</p><p className="text-3xl font-bold text-slate-700">42.1%</p><p className="text-xs text-green-600 mt-1">+6.2% vs last quarter</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-porsche-600" />
          <h3 className="text-base font-semibold text-titanium-900">PCI Procedure Breakdown by Complexity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-titanium-50"><tr>{['Procedure Type', 'Volume', 'Technical Success', 'Complications', 'Avg LOS', 'Avg Cost'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-titanium-100">
              {procedures.map((p, i) => (
                <tr key={i} className="hover:bg-titanium-50">
                  <td className="px-4 py-3 font-medium text-titanium-900">{p.type}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-titanium-800">{p.volume.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{p.success}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">{p.complications}</span></td>
                  <td className="px-4 py-3 text-titanium-600">{p.avgLos}</td>
                  <td className="px-4 py-3 font-mono text-titanium-700">{p.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// CABG Analytics
const CABGAnalytics: React.FC = () => {
  const data = [
    { type: 'Isolated CABG', volume: 234, mortality: '1.2%', stroke: '0.9%', reop: '2.1%', grafts: 3.2, arterial: '89%' },
    { type: 'CABG + Valve', volume: 89, mortality: '3.4%', stroke: '2.1%', reop: '3.8%', grafts: 2.8, arterial: '76%' },
    { type: 'Redo CABG', volume: 67, mortality: '4.1%', stroke: '2.8%', reop: '4.2%', grafts: 2.1, arterial: '62%' },
    { type: 'Minimally Invasive CABG', volume: 66, mortality: '0.8%', stroke: '0.6%', reop: '1.4%', grafts: 1.8, arterial: '95%' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-porsche-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Total CABG Volume</p><p className="text-3xl font-bold text-titanium-900">456</p><p className="text-xs text-green-600 mt-1">+3.2% vs last quarter</p></div>
        <div className="metal-card p-5 border-l-4 border-l-red-400"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Risk-Adj. Mortality</p><p className="text-3xl font-bold text-red-700">1.8%</p><p className="text-xs text-green-600 mt-1">Below STS benchmark (2.4%)</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Arterial Graft Rate</p><p className="text-3xl font-bold text-blue-700">84.2%</p><p className="text-xs text-green-600 mt-1">+3.1% vs last quarter</p></div>
        <div className="metal-card p-5 border-l-4 border-l-slate-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Bilateral IMA Rate</p><p className="text-3xl font-bold text-slate-700">41.3%</p><p className="text-xs text-green-600 mt-1">+8.7% vs last quarter</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <Heart className="w-5 h-5 text-porsche-600" />
          <h3 className="text-base font-semibold text-titanium-900">CABG Outcomes by Procedure Type</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-titanium-50"><tr>{['Procedure', 'Volume', '30-Day Mortality', 'Stroke Rate', 'Reop Rate', 'Avg Grafts', 'Arterial %'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-titanium-100">
              {data.map((d, i) => (
                <tr key={i} className="hover:bg-titanium-50">
                  <td className="px-4 py-3 font-medium text-titanium-900">{d.type}</td>
                  <td className="px-4 py-3 font-mono font-semibold">{d.volume}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">{d.mortality}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">{d.stroke}</span></td>
                  <td className="px-4 py-3 text-titanium-600">{d.reop}</td>
                  <td className="px-4 py-3 font-mono">{d.grafts}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{d.arterial}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// STEMI Pathways
const STEMIPathways: React.FC = () => {
  const metrics = [
    { label: 'Median D2B Time', value: '52 min', target: '≤90 min', trend: '-4 min vs last quarter' },
    { label: 'D2B ≤90 Min Rate', value: '94.6%', target: '≥75%', trend: '+1.8% vs last quarter' },
    { label: 'FMC-to-Device Time', value: '78 min', target: '≤120 min', trend: '-6 min vs last quarter' },
    { label: 'Cath Lab Activation Time', value: '18 min', target: '≤20 min', trend: '-2 min vs last quarter' },
    { label: 'In-Hospital STEMI Mortality', value: '3.2%', target: '≤5%', trend: '-0.4% vs last quarter' },
    { label: 'Transfer STEMI Volume', value: '143', target: '—', trend: '+11% vs last quarter' },
  ];
  const sites = [
    { name: 'Main Campus (Hub)', vol: 244, d2b: '48 min', rate: '96.3%' },
    { name: 'North Campus', vol: 87, d2b: '61 min', rate: '91.4%' },
    { name: "Regional Partner — St. Mary's", vol: 56, d2b: '82 min', rate: '87.5%' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-red-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Primary PCI Volume</p><p className="text-3xl font-bold text-titanium-900">387</p><p className="text-xs text-green-600 mt-1">+12.1% vs last quarter</p></div>
        <div className="metal-card p-5 border-l-4 border-l-green-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Median D2B Time</p><p className="text-3xl font-bold text-green-700">52 min</p><p className="text-xs text-titanium-500 mt-1">ACC/AHA target: ≤90 min</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">D2B ≤90 Min Rate</p><p className="text-3xl font-bold text-blue-700">94.6%</p><p className="text-xs text-green-600 mt-1">Above ACC benchmark (75%)</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-red-600" />
          <h3 className="text-base font-semibold text-titanium-900">STEMI Performance Metrics</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {metrics.map((m, i) => (
            <div key={i} className="rounded-xl border bg-green-50 border-green-200 px-4 py-3 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide">{m.label}</p>
                <p className="text-xl font-bold text-titanium-900 mt-0.5">{m.value}</p>
                <p className="text-xs text-titanium-500">Target: {m.target}</p>
              </div>
              <p className="text-xs text-green-700 font-medium text-right ml-2">{m.trend}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100"><h3 className="text-base font-semibold text-titanium-900">STEMI Network — Site Performance</h3></div>
        <table className="w-full text-sm">
          <thead className="bg-titanium-50"><tr>{['Site', 'STEMI Volume', 'Median D2B', 'D2B ≤90 Rate'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-titanium-100">
            {sites.map((s, i) => <tr key={i} className="hover:bg-titanium-50"><td className="px-4 py-3 font-medium text-titanium-900">{s.name}</td><td className="px-4 py-3 font-mono font-semibold">{s.vol}</td><td className="px-4 py-3">{s.d2b}</td><td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{s.rate}</span></td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Quality Metrics
const CoronaryQualityMetrics: React.FC = () => {
  const measures = [
    { measure: 'Aspirin at Discharge (ACS)', rate: '99.2%', benchmark: '98%', above: true, registry: 'CathPCI' },
    { measure: 'Statin at Discharge (PCI)', rate: '98.7%', benchmark: '96%', above: true, registry: 'CathPCI' },
    { measure: 'DAPT Prescribed (PCI)', rate: '99.1%', benchmark: '97%', above: true, registry: 'CathPCI' },
    { measure: 'Radial Access Rate', rate: '67.3%', benchmark: '60%', above: true, registry: 'CathPCI' },
    { measure: 'IVUS/OCT Use (Complex PCI)', rate: '42.1%', benchmark: '35%', above: true, registry: 'CathPCI' },
    { measure: 'CABG Risk-Adj. Mortality', rate: '1.8%', benchmark: '2.4%', above: true, registry: 'STS' },
    { measure: 'CABG Deep Sternal Wound Infection', rate: '0.4%', benchmark: '0.5%', above: true, registry: 'STS' },
    { measure: 'Cardiac Rehab Referral Rate', rate: '71.4%', benchmark: '80%', above: false, registry: 'ACC-NCDR' },
    { measure: 'Beta-Blocker at Discharge (STEMI)', rate: '97.8%', benchmark: '97%', above: true, registry: 'CathPCI' },
    { measure: 'PCSK9i Initiation Post-ACS', rate: '24.3%', benchmark: '—', above: false, registry: 'Gap 52' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-green-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Above Benchmark</p><p className="text-3xl font-bold text-green-700">8 / 10</p><p className="text-xs text-titanium-500 mt-1">CathPCI + STS registry measures</p></div>
        <div className="metal-card p-5 border-l-4 border-l-amber-400"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Below Benchmark</p><p className="text-3xl font-bold text-amber-700">2 / 10</p><p className="text-xs text-titanium-500 mt-1">Cardiac rehab + PCSK9i gap</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Registry Submissions</p><p className="text-3xl font-bold text-blue-700">100%</p><p className="text-xs text-titanium-500 mt-1">CathPCI, STS, ACC-NCDR current</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-porsche-600" />
          <h3 className="text-base font-semibold text-titanium-900">Quality Measures — Current Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-titanium-50"><tr>{['Quality Measure', 'Rate', 'Benchmark', 'Status', 'Registry'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-titanium-100">
              {measures.map((m, i) => (
                <tr key={i} className="hover:bg-titanium-50">
                  <td className="px-4 py-3 font-medium text-titanium-900">{m.measure}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-titanium-800">{m.rate}</td>
                  <td className="px-4 py-3 text-titanium-500">{m.benchmark}</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m.above ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{m.above ? 'Above Benchmark' : 'Below / Gap'}</span></td>
                  <td className="px-4 py-3 text-titanium-500 text-xs">{m.registry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// CAD Intervention Pipeline — powered by live gap detection data (Gaps 46, 47, 48, 52)
const CADInterventionPipeline: React.FC = () => {
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  const heartTeamGap = CAD_CLINICAL_GAPS.find(g => g.id === 'cad-gap-46-heart-team');
  const completeRevascGap = CAD_CLINICAL_GAPS.find(g => g.id === 'cad-gap-47-complete-revasc');
  const ctoGap = CAD_CLINICAL_GAPS.find(g => g.id === 'cad-gap-48-cto');
  const pcsk9Gap = CAD_CLINICAL_GAPS.find(g => g.id === 'cad-gap-52-post-acs-pcsk9i');

  const totalHeartTeam = heartTeamGap?.patientCount ?? 0;
  const totalRevasc = completeRevascGap?.patientCount ?? 0;
  const totalCTO = ctoGap?.patientCount ?? 0;
  const totalPCSK9 = pcsk9Gap?.patientCount ?? 0;
  const totalPipeline = totalHeartTeam + totalRevasc + totalCTO + totalPCSK9;

  const renderSAQ = (p: CADGapPatient) => {
    if (p.saqAnginaFrequency == null) return null;
    return (
      <div className="mt-3 border-t border-titanium-100 pt-3">
        <p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-2">SAQ Scores</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div className="bg-porsche-50 rounded-lg px-3 py-2">
            <p className="text-xs text-titanium-500">Angina Frequency</p>
            <p className="text-sm font-semibold text-porsche-800">{p.saqAnginaFrequency}</p>
          </div>
          {p.saqPriorAnginaFrequency != null && (
            <div className="bg-titanium-50 rounded-lg px-3 py-2">
              <p className="text-xs text-titanium-500">Prior Angina Freq.</p>
              <p className="text-sm font-semibold text-titanium-900">{p.saqPriorAnginaFrequency}</p>
            </div>
          )}
          {p.saqAdministeredDate && (
            <div className="bg-titanium-50 rounded-lg px-3 py-2">
              <p className="text-xs text-titanium-500">SAQ Date</p>
              <p className="text-sm font-semibold text-titanium-900">{p.saqAdministeredDate}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPatient = (p: CADGapPatient, borderCls: string, bgCls: string) => {
    const isOpen = expandedPatient === p.id;
    return (
      <div key={p.id} className={`border rounded-xl overflow-hidden ${borderCls}`}>
        <button
          className={`w-full flex items-center justify-between px-4 py-3 text-left ${bgCls}`}
          onClick={() => setExpandedPatient(isOpen ? null : p.id)}
        >
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-titanium-500 flex-shrink-0" />
            <div>
              <span className="font-semibold text-titanium-900">{p.name}</span>
              <span className="ml-2 text-xs text-titanium-500">{p.mrn} &middot; Age {p.age}</span>
            </div>
          </div>
          {isOpen
            ? <ChevronUp className="w-4 h-4 text-titanium-400 flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-titanium-400 flex-shrink-0" />}
        </button>
        {isOpen && (
          <div className="px-4 pb-4 border-t border-titanium-100 bg-white">
            <p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mt-3 mb-2">Detection Signals</p>
            <ul className="space-y-1 mb-3">
              {p.signals.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-titanium-700">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(p.keyValues).map(([k, v]) => (
                <div key={k} className="bg-titanium-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-titanium-500">{k}</p>
                  <p className="text-sm font-semibold text-titanium-900">{v}</p>
                </div>
              ))}
            </div>
            {renderSAQ(p)}
            {(() => {
              const cathFindings = String(p.keyValues['Cath Findings'] || p.keyValues['Coronary Anatomy'] || p.keyValues['Estimated SYNTAX'] || '');
              const ctoPresent = p.signals.some(s => s.toLowerCase().includes('cto')) ||
                String(p.keyValues['CTO'] || '').toLowerCase().includes('yes');
              if (!cathFindings && !ctoPresent) return null;
              const syntaxResult = estimateSYNTAX({ cathFindings: cathFindings || undefined, ctoPresent: ctoPresent || undefined });
              if (syntaxResult.tier === 'Unknown') return null;
              return (
                <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span className="text-xs text-blue-800 font-medium">
                    SYNTAX (estimated): ~{syntaxResult.score} &mdash; {syntaxResult.tier}
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderGapSection = (
    gap: typeof heartTeamGap,
    icon: React.ReactNode,
    label: string,
    priorityLabel: string,
    priorityCls: string,
    borderCls: string,
    bgCls: string,
    patientBorderCls: string,
    patientBgCls: string,
    actionCls: string
  ) => {
    if (!gap) return null;
    return (
      <div className={`metal-card bg-white border rounded-2xl p-6 ${borderCls}`}>
        <div className="flex items-start gap-3 mb-4">
          {icon}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-titanium-900">{gap.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityCls}`}>{priorityLabel}</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">{gap.patientCount} patients</span>
            </div>
            <p className="text-xs text-titanium-600 mt-1">{gap.evidence}</p>
            <p className={`text-xs font-semibold mt-2 ${actionCls}`}>Action: {gap.cta}</p>
          </div>
        </div>
        {gap.subcategories && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {gap.subcategories.map((sub, i) => (
              <div
                key={i}
                className={`rounded-lg px-4 py-3 border ${i === 0 ? `${bgCls} ${patientBorderCls}` : 'bg-titanium-50 border-titanium-200'}`}
              >
                <p className="text-sm font-bold text-titanium-900">{sub.count} patients</p>
                <p className="text-xs text-titanium-600">{sub.label}</p>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          {gap.patients.map(p => renderPatient(p, patientBorderCls, patientBgCls))}
          {gap.patientCount > gap.patients.length && (
            <p className="text-center text-sm text-titanium-500 py-2">
              +{gap.patientCount - gap.patients.length} additional patients in the registry
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Pipeline KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Multivessel CAD Heart Team</p>
          <p className="text-3xl font-bold text-blue-800">{totalHeartTeam}</p>
          <p className="text-xs text-titanium-500 mt-1">Heart team review not documented</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-amber-400">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Complete Revasc Needed</p>
          <p className="text-3xl font-bold text-amber-800">{totalRevasc}</p>
          <p className="text-xs text-titanium-500 mt-1">Non-culprit lesion untreated post-ACS</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">CTO Referral Indicated</p>
          <p className="text-3xl font-bold text-blue-800">{totalCTO}</p>
          <p className="text-xs text-titanium-500 mt-1">CTO PCI referral not made</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-red-500">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Post-ACS PCSK9i Window</p>
          <p className="text-3xl font-bold text-red-800">{totalPCSK9}</p>
          <p className="text-xs text-titanium-500 mt-1">Highest-benefit window — time-sensitive</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-porsche-500">
          <p className="text-xs font-semibold text-porsche-600 uppercase tracking-wide mb-1">Total CAD Pipeline</p>
          <p className="text-3xl font-bold text-porsche-800">{totalPipeline}</p>
          <p className="text-xs text-titanium-500 mt-1">Patients requiring intervention or referral</p>
        </div>
      </div>

      {/* Pipeline Forecast — Quarterly Projection */}
      <div className="metal-card mb-4">
        <div className="px-5 py-3 border-b border-titanium-200 bg-gradient-to-r from-slate-50/50 to-white">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-semibold text-titanium-800">Pipeline Forecast — Quarterly Projection</span>
            <span className="text-xs bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-medium">Trajectory-based</span>
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-titanium-100">
          {[
            { label: 'Q1 2026', revenue: 2400000, procedures: 32 },
            { label: 'Q2 2026', revenue: 1800000, procedures: 24 },
            { label: 'Q3 2026', revenue: 1400000, procedures: 18 },
            { label: 'Q4 2026', revenue: 1000000, procedures: 14 },
          ].map((q, i) => (
            <div key={i} className="px-4 py-3 text-center">
              <div className="text-xs font-semibold text-titanium-500 uppercase">{q.label}</div>
              <div className="text-lg font-bold text-emerald-700 mt-1">{formatDollar(q.revenue)}</div>
              <div className="text-xs text-titanium-500">{q.procedures} procedures</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gap 46 — Multivessel CAD Heart Team */}
      {renderGapSection(
        heartTeamGap,
        <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />,
        'Gap 46',
        'HIGH PRIORITY',
        'bg-blue-100 text-blue-800',
        'border-blue-200',
        'bg-blue-50',
        'border-blue-100',
        'bg-blue-50',
        'text-blue-700'
      )}

      {/* Gap 47 — Complete Revascularization */}
      {renderGapSection(
        completeRevascGap,
        <Activity className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />,
        'Gap 47',
        'HIGH PRIORITY',
        'bg-amber-100 text-amber-800',
        'border-amber-200',
        'bg-amber-50',
        'border-amber-100',
        'bg-amber-50',
        'text-amber-700'
      )}

      {/* Gap 48 — CTO Referral */}
      {renderGapSection(
        ctoGap,
        <Target className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />,
        'Gap 48',
        'REFERRAL',
        'bg-blue-100 text-blue-800',
        'border-blue-200',
        'bg-blue-50',
        'border-blue-100',
        'bg-blue-50',
        'text-blue-700'
      )}

      {/* Gap 52 — Post-ACS PCSK9i */}
      {renderGapSection(
        pcsk9Gap,
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />,
        'Gap 52',
        'TIME-SENSITIVE',
        'bg-red-100 text-red-800',
        'border-red-200',
        'bg-red-50',
        'border-red-100',
        'bg-red-50',
        'text-red-700'
      )}

      {/* Automation callout */}
      <div className="metal-card bg-porsche-50 border border-porsche-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-porsche-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-base font-semibold text-titanium-900 mb-1">Automated Pipeline Detection</h3>
            <p className="text-sm text-titanium-600">&#9889; Patients automatically identified from EHR data via Redox</p>
          </div>
        </div>
      </div>

      {/* Pipeline Velocity Metric */}
      <div className="mt-4 metal-card">
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-semibold text-titanium-800">Pipeline Velocity</span>
            <span className="text-xs bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-medium">Forward-looking</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-titanium-50/70 rounded-lg p-3">
              <div className="text-xs text-titanium-500 mb-1">Current Rate</div>
              <div className="text-lg font-bold text-red-600">18 months</div>
              <div className="text-xs text-titanium-400">to clear pipeline</div>
            </div>
            <div className="bg-emerald-50/70 rounded-lg p-3">
              <div className="text-xs text-titanium-500 mb-1">Systematic Closure</div>
              <div className="text-lg font-bold text-emerald-600">6 months</div>
              <div className="text-xs text-titanium-400">with TAILRD protocol</div>
            </div>
            <div className="bg-blue-50/70 rounded-lg p-3">
              <div className="text-xs text-titanium-500 mb-1">Revenue Acceleration</div>
              <div className="text-lg font-bold text-blue-600">{formatDollar(4700000)}</div>
              <div className="text-xs text-titanium-400">in 12 months</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Coronary Intervention Service Line Tab Configuration
const coronaryTabs: ServiceLineTabConfig[] = [
  {
 id: 'analytics',
 label: 'Coronary Analytics',
 icon: Target,
 description: 'Comprehensive PCI and CABG analytics dashboard'
  },
  {
 id: 'heatmap',
 label: 'Patient Risk Heatmap',
 icon: Grid3X3,
 description: 'Coronary disease risk visualization matrix'
  },
  {
 id: 'providers',
 label: 'Provider Performance',
 icon: Users,
 description: 'Interventionalist and surgeon performance metrics'
  },
  {
 id: 'calculators',
 label: 'Risk Calculators',
 icon: Calculator,
 description: 'GRACE, TIMI, and SYNTAX score calculators'
  },
  {
 id: 'pci-analytics',
 label: 'PCI Analytics',
 icon: BarChart3,
 description: 'Percutaneous coronary intervention procedure metrics'
  },
  {
 id: 'cabg-analytics',
 label: 'CABG Analytics',
 icon: Heart,
 description: 'Coronary artery bypass graft surgery analytics'
  },
  {
 id: 'stemi-pathways',
 label: 'STEMI Pathways',
 icon: Zap,
 description: 'Primary PCI and emergency cardiac care optimization'
  },
  {
 id: 'safety',
 label: 'Safety Screening',
 icon: Shield,
 description: 'Pre-procedural safety assessment and protocols'
  },
  {
 id: 'network',
 label: 'Care Team Network',
 icon: Network,
 description: 'Coronary care team collaboration and referral patterns'
  },
  {
 id: 'pci-network',
 label: 'PCI Network',
 icon: Activity,
 description: 'PCI network analysis and patient flow visualization'
  },
  {
 id: 'quality',
 label: 'Quality Metrics',
 icon: Award,
 description: 'CathPCI Registry, STS database, and quality indicators'
  },
  {
 id: 'reporting',
 label: 'Automated Reports',
 icon: FileText,
 description: 'Scheduled reporting and registry submissions'
  },
  {
 id: 'intervention-pipeline',
 label: 'Intervention Pipeline',
 icon: Target,
 description: 'CAD intervention pipeline: 134 multivessel heart team, 89 complete revascularization, 47 CTO referral, 58 post-ACS PCSK9i — all auto-detected from EHR data'
  },
  {
 id: 'cad-clinical-gap-detection',
 label: 'Gap Detection (31-Gap)',
 icon: Target,
 description: 'AI-driven CAD gap detection: SGLT2i/CKD, COMPASS dual-pathway, PCSK9i, cardiac rehab, Lp(a), imaging-guided PCI, DAPT safety, FFR/iFR, CTO, CCTA, INOCA, bempedoic acid, icosapent ethyl, ranolazine, BB deprescribing, bilateral IMA, post-CABG surveillance, vasospastic angina, hs-TnT, OAC monotherapy (cross-module), heart team review +11 more All gap detection criteria, risk scores, and composite calculators are automatically computed from structured EHR data ingested via Redox — no manual data entry or chart review required.'
  },
  {
 id: 'pro-outcomes',
 label: 'PRO Outcomes',
 icon: Activity,
 description: 'SAQ patient-reported outcomes tracking for angina burden'
  }
];

// Export data configurations
const coronaryExportData: Record<string, ExportData> = {
  providers: {
 headers: [
 'Provider Name',
 'Specialty',
 'PCI Volume',
 'CABG Volume',
 'Success Rate',
 'Complication Rate',
 'Quality Score'
 ],
 rows: [
 ['Dr. Michael Chen', 'Interventional Cardiologist', '287', '0', '98.2%', '2.1%', '96.8'],
 ['Dr. Sarah Rodriguez', 'Cardiac Surgeon', '0', '156', '97.4%', '3.2%', '95.1'],
 ['Dr. James Wilson', 'Interventional Cardiologist', '312', '0', '97.8%', '1.9%', '97.2'],
 ['Dr. Lisa Thompson', 'Cardiac Surgeon', '0', '189', '96.8%', '2.8%', '94.7'],
 ['Dr. David Park', 'Interventional Cardiologist', '298', '0', '98.1%', '2.3%', '96.4'],
 ['Dr. Amanda Martinez', 'Cardiac Surgeon', '0', '134', '97.0%', '3.1%', '95.3']
 ],
 filename: 'coronary_intervention_provider_performance',
 title: 'Coronary Intervention Provider Performance Report',
 metadata: {
 'Report Type': 'Provider Scorecard',
 'Service Line': 'Coronary Intervention',
 'Period': 'Q4 2024',
 'Total Procedures': '1,376',
 'Avg Success Rate': '97.5%',
 'Avg Quality Score': '95.9'
 }
  },
  procedures: {
 headers: [
 'Procedure Type',
 'Volume',
 'Success Rate',
 'Complication Rate',
 'Door-to-Balloon (STEMI)',
 'Cost per Case'
 ],
 rows: [
 ['Primary PCI (STEMI)', '387', '98.7%', '2.1%', '67 min', '$18,234'],
 ['Elective PCI', '1,892', '98.9%', '1.4%', 'N/A', '$15,678'],
 ['Complex PCI', '568', '96.8%', '4.2%', 'N/A', '$23,451'],
 ['CABG (Isolated)', '234', '97.9%', '3.8%', 'N/A', '$42,187'],
 ['CABG + Valve', '67', '95.5%', '6.1%', 'N/A', '$58,923'],
 ['Redo CABG', '23', '93.5%', '8.7%', 'N/A', '$67,234']
 ],
 filename: 'coronary_intervention_procedure_analytics',
 title: 'Coronary Intervention Procedure Analytics Report',
 metadata: {
 'Report Type': 'Procedure Analytics',
 'Service Line': 'Coronary Intervention',
 'Total Procedures': '3,171',
 'Overall Success Rate': '97.8%',
 'Avg Door-to-Balloon': '67 minutes'
 }
  }
};

// Coronary Intervention Service Line Configuration
export const coronaryServiceLineConfig: ServiceLineViewConfig = {
  moduleName: 'Coronary Intervention',
  moduleDescription: 'Advanced PCI and CABG analytics for procedure optimization and quality improvement',
  moduleIcon: Activity,
  primaryColor: 'porsche',
  tabs: coronaryTabs,
  tabContent: {
 'analytics': CoronaryInterventionAnalytics,
 'heatmap': PatientRiskHeatmap,
 'providers': CoronaryProviderScorecard,
 'calculators': CoronaryRiskCalculators,
 'pci-analytics': PCIProcedureAnalytics,
 'cabg-analytics': CABGAnalytics,
 'stemi-pathways': STEMIPathways,
 'safety': CoronarySafetyScreening,
 'network': CareTeamNetworkGraph,
 'pci-network': PCINetworkVisualization,
 'quality': CoronaryQualityMetrics,
 'reporting': AutomatedReportingSystem,
 'intervention-pipeline': CADInterventionPipeline,
 'cad-clinical-gap-detection': CADClinicalGapDetectionDashboard,
 'pro-outcomes': SAQOutcomesPanel
  },
  exportData: coronaryExportData,
  hasExport: true
};