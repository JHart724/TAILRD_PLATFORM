import React, { useState } from 'react';
import { Zap, Users, Network, Brain, DollarSign, Target, Grid3X3, Activity, Shield, Award, BarChart3, FileText, Heart, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { ServiceLineViewConfig } from '../../../components/shared/BaseServiceLineView';
import { ServiceLineTabConfig } from '../../../components/shared/StandardInterfaces';
import { ExportData } from '../../../utils/dataExport';
import { formatDollar } from '../../../utils/predictiveCalculators';

// Import existing EP Service Line components
import EPAutomatedClinicalSupport from '../components/EPAutomatedClinicalSupport';
import EPROICalculator from '../components/EPROICalculator';
import EPDeviceNetworkVisualization from '../components/EPDeviceNetworkVisualization';
import EPClinicalDecisionSupport from '../components/EPClinicalDecisionSupport';
import AnticoagulationSafetyChecker from '../components/AnticoagulationSafetyChecker';
import LAACRiskDashboard from '../components/LAACRiskDashboard';
import PatientDetailPanel from '../components/PatientDetailPanel';
import EPOutcomesByCohort from '../components/service-line/EPOutcomesByCohort';
import EPOutcomesTrends from '../components/executive/EPOutcomesTrends';
import EPPhenotypeDetectionChart from '../components/EPPhenotypeDetectionChart';

// Import shared components
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';
import EPClinicalGapDetectionDashboard, { EP_CLINICAL_GAPS, EPGapPatient } from '../components/clinical/EPClinicalGapDetectionDashboard';

// Electrophysiology Analytics Dashboard
const ElectrophysiologyAnalytics: React.FC = () => (
  <div className="space-y-6">
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">AFib Ablations</h4>
 <div className="text-2xl font-bold text-titanium-900">1,234</div>
 <div className="text-sm text-[#2C4A60]">+14.7% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">LAAC Procedures</h4>
 <div className="text-2xl font-bold text-titanium-900">456</div>
 <div className="text-sm text-[#2C4A60]">+28.3% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">Device Implants</h4>
 <div className="text-2xl font-bold text-titanium-900">789</div>
 <div className="text-sm text-[#2C4A60]">+9.2% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">Lead Extractions</h4>
 <div className="text-2xl font-bold text-titanium-900">123</div>
 <div className="text-sm text-[#2C4A60]">+6.5% vs last quarter</div>
 </div>
 </div>
 <div className="metal-card p-8">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Target className="w-5 h-5 text-[#2C4A60]" />
 Procedure Analytics
 </h3>
 <p className="text-titanium-600 mb-6">Comprehensive electrophysiology analytics including AFib ablations, LAAC procedures, device implantations, arrhythmia management, and anticoagulation optimization.</p>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* AFib Ablation Outcomes */}
 <div className="bg-white border border-titanium-200 rounded-lg p-5">
   <h4 className="font-bold text-titanium-900 mb-4">AFib Ablation Outcomes</h4>
   <div className="divide-y divide-titanium-100">
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">AFib Freedom 1yr</span><span className="text-sm font-semibold text-[#2C4A60]">73.4%</span></div>
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">PFA Adoption</span><span className="text-sm font-semibold text-[#2C4A60]">31.2%</span></div>
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">RF/Cryo Success</span><span className="text-sm font-semibold text-[#2C4A60]">78.4%</span></div>
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">PFA Success</span><span className="text-sm font-semibold text-[#2C4A60]">82.1%</span></div>
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">Complication Rate</span><span className="text-sm font-semibold text-[#2C4A60]">1.9%</span></div>
   </div>
 </div>
 {/* Device Metrics */}
 <div className="bg-white border border-titanium-200 rounded-lg p-5">
   <h4 className="font-bold text-titanium-900 mb-4">Device Metrics</h4>
   <div className="divide-y divide-titanium-100">
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">PM Implant Success</span><span className="text-sm font-semibold text-[#2C4A60]">99.6%</span></div>
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">ICD/CRT-D Success</span><span className="text-sm font-semibold text-[#2C4A60]">99.1%</span></div>
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">Lead Extraction Success</span><span className="text-sm font-semibold text-[#2C4A60]">97.6%</span></div>
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">Total Implants YTD</span><span className="text-sm font-semibold text-[#2C4A60]">789</span></div>
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">Remote Monitoring Rate</span><span className="text-sm font-semibold text-[#2C4A60]">94.2%</span></div>
   </div>
 </div>
 {/* LAAC Program */}
 <div className="bg-white border border-titanium-200 rounded-lg p-5">
   <h4 className="font-bold text-titanium-900 mb-4">LAAC Program</h4>
   <div className="divide-y divide-titanium-100">
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">Complete Seal</span><span className="text-sm font-semibold text-[#2C4A60]">98.7%</span></div>
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">Eligible Population</span><span className="text-sm font-semibold text-[#2C4A60]">456</span></div>
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">OAC Discontinuation at 45d</span><span className="text-sm font-semibold text-[#2C4A60]">96.3%</span></div>
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">Peri-procedural Leak &lt;5mm</span><span className="text-sm font-semibold text-[#2C4A60]">1.2%</span></div>
     <div className="flex justify-between items-center py-2"><span className="text-sm text-titanium-600">Complication Rate</span><span className="text-sm font-semibold text-[#2C4A60]">1.7%</span></div>
   </div>
 </div>
 </div>
 </div>
  </div>
);

// EP Procedure Analytics
const EPProcedureAnalytics: React.FC = () => {
  const procedures = [
    { type: 'AFib Ablation (PVI — RF/Cryo)', volume: 687, success: '78.4%', free1yr: '71.2%', complications: '2.3%', avgTime: '2.8h' },
    { type: 'AFib Ablation (PFA — Farawave)', volume: 312, success: '82.1%', free1yr: '75.6%', complications: '1.4%', avgTime: '2.1h' },
    { type: 'AFL Ablation', volume: 234, success: '96.8%', free1yr: '93.4%', complications: '0.9%', avgTime: '1.2h' },
    { type: 'VT Ablation', volume: 87, success: '74.7%', free1yr: '66.7%', complications: '4.6%', avgTime: '4.2h' },
    { type: 'AVNRT/SVT Ablation', volume: 198, success: '98.5%', free1yr: '96.5%', complications: '0.5%', avgTime: '1.1h' },
    { type: 'LAAC (Watchman FLX)', volume: 234, success: '98.7%', free1yr: '—', complications: '1.7%', avgTime: '0.9h' },
    { type: 'Pacemaker Implant', volume: 456, success: '99.6%', free1yr: '—', complications: '0.9%', avgTime: '0.7h' },
    { type: 'ICD/CRT-D Implant', volume: 234, success: '99.1%', free1yr: '—', complications: '1.3%', avgTime: '1.4h' },
    { type: 'Lead Extraction', volume: 123, success: '97.6%', free1yr: '—', complications: '3.3%', avgTime: '1.8h' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Total EP Procedures</p><p className="text-3xl font-bold text-titanium-900">2,565</p><p className="text-xs text-[#2C4A60] mt-1">+11.3% vs last quarter</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">PFA Adoption</p><p className="text-3xl font-bold text-blue-700">31.2%</p><p className="text-xs text-[#2C4A60] mt-1">+18% vs last quarter</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">AFib Freedom at 1yr</p><p className="text-3xl font-bold text-[#2C4A60]">73.4%</p><p className="text-xs text-titanium-500 mt-1">Avg across AFib ablations</p></div>
        <div className="metal-card p-5 border-l-4 border-l-slate-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">LAAC Seal Rate</p><p className="text-3xl font-bold text-slate-700">98.7%</p><p className="text-xs text-titanium-500 mt-1">Complete closure at 45 days</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#2C4A60]" />
          <h3 className="text-base font-semibold text-titanium-900">EP Procedure Volume &amp; Outcomes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-titanium-50"><tr>{['Procedure', 'Volume', 'Acute Success', 'Free at 1yr', 'Complications', 'Avg Time'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-titanium-100">
              {procedures.map((p, i) => (
                <tr key={i} className="hover:bg-titanium-50">
                  <td className="px-4 py-3 font-medium text-titanium-900">{p.type}</td>
                  <td className="px-4 py-3 font-mono font-semibold">{p.volume}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#C8D4DC] text-[#2C4A60]">{p.success}</span></td>
                  <td className="px-4 py-3 text-titanium-600">{p.free1yr}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#F0F5FA] text-[#6B7280]">{p.complications}</span></td>
                  <td className="px-4 py-3 text-titanium-600">{p.avgTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// EP Provider Performance
const EPProviderPerformance: React.FC = () => {
  const providers = [
    { name: 'Dr. Michael Rodriguez', specialty: 'Electrophysiologist', ablations: 187, devices: 234, successRate: '94.7%', complications: '2.1%', quality: 96.2 },
    { name: 'Dr. Sarah Kim', specialty: 'Electrophysiologist', ablations: 156, devices: 198, successRate: '93.8%', complications: '2.4%', quality: 95.1 },
    { name: 'Dr. James Chen', specialty: 'Electrophysiologist', ablations: 212, devices: 167, successRate: '95.2%', complications: '1.8%', quality: 97.4 },
    { name: 'Dr. Lisa Thompson', specialty: 'Electrophysiologist', ablations: 134, devices: 289, successRate: '94.1%', complications: '2.2%', quality: 95.8 },
    { name: 'Dr. Robert Park', specialty: 'Electrophysiologist', ablations: 198, devices: 156, successRate: '96.1%', complications: '1.6%', quality: 97.9 },
    { name: 'Dr. Amanda Foster', specialty: 'Cardiac Electrophysiologist', ablations: 167, devices: 201, successRate: '93.4%', complications: '2.7%', quality: 94.6 },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Total EPs</p><p className="text-3xl font-bold text-titanium-900">6</p><p className="text-xs text-titanium-500 mt-1">Board-certified electrophysiologists</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Avg Ablation Success</p><p className="text-3xl font-bold text-[#2C4A60]">94.6%</p><p className="text-xs text-titanium-500 mt-1">Freedom from arrhythmia at 1 yr</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Total Procedures</p><p className="text-3xl font-bold text-blue-700">2,299</p><p className="text-xs text-titanium-500 mt-1">Ablations + device implants</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#2C4A60]" />
          <h3 className="text-base font-semibold text-titanium-900">EP Provider Performance Scorecard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-titanium-50"><tr>{['Provider', 'Specialty', 'AFib Ablations', 'Device Implants', 'Success Rate', 'Complications', 'Quality Score'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-titanium-100">
              {providers.map((p, i) => (
                <tr key={i} className="hover:bg-titanium-50">
                  <td className="px-4 py-3 font-semibold text-titanium-900">{p.name}</td>
                  <td className="px-4 py-3 text-titanium-600">{p.specialty}</td>
                  <td className="px-4 py-3 text-center font-mono">{p.ablations}</td>
                  <td className="px-4 py-3 text-center font-mono">{p.devices}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#C8D4DC] text-[#2C4A60]">{p.successRate}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#F0F5FA] text-[#6B7280]">{p.complications}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="flex-1 bg-titanium-100 rounded-full h-2"><div className="bg-[#F0F5FA] h-2 rounded-full" style={{ width: `${p.quality}%` }} /></div><span className="text-xs font-semibold text-titanium-700">{p.quality}</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Arrhythmia Management
const ArrhythmiaManagement: React.FC = () => {
  const data = [
    { arrhythmia: 'Paroxysmal AFib', patients: 1876, rhythm: '64%', rate: '36%', ablation: '34%', oac: '87%' },
    { arrhythmia: 'Persistent AFib', patients: 1243, rhythm: '48%', rate: '52%', ablation: '28%', oac: '91%' },
    { arrhythmia: 'Long-Standing Persistent', patients: 567, rhythm: '31%', rate: '69%', ablation: '18%', oac: '93%' },
    { arrhythmia: 'Typical AFL', patients: 312, rhythm: '89%', rate: '11%', ablation: '78%', oac: '72%' },
    { arrhythmia: 'VT / VF', patients: 234, rhythm: '67%', rate: '—', ablation: '37%', oac: '—' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Total AFib Patients</p><p className="text-3xl font-bold text-titanium-900">3,686</p><p className="text-xs text-titanium-500 mt-1">Active in program</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Anticoagulation Rate</p><p className="text-3xl font-bold text-blue-700">89.4%</p><p className="text-xs text-titanium-500 mt-1">Eligible CHA2DS2-VASc ≥2</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Rhythm Control Rate</p><p className="text-3xl font-bold text-[#2C4A60]">58.2%</p><p className="text-xs text-titanium-500 mt-1">Across all AFib types</p></div>
        <div className="metal-card p-5 border-l-4 border-l-slate-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">AFib Ablation Rate</p><p className="text-3xl font-bold text-slate-700">29.3%</p><p className="text-xs text-[#2C4A60] mt-1">+4.1% vs last quarter</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#2C4A60]" />
          <h3 className="text-base font-semibold text-titanium-900">Arrhythmia Management by Type</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-titanium-50"><tr>{['Arrhythmia', 'Patients', 'Rhythm Control', 'Rate Control', 'Ablation Rate', 'OAC Rate'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-titanium-100">
              {data.map((d, i) => (
                <tr key={i} className="hover:bg-titanium-50">
                  <td className="px-4 py-3 font-medium text-titanium-900">{d.arrhythmia}</td>
                  <td className="px-4 py-3 font-mono font-semibold">{d.patients.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{d.rhythm}</span></td>
                  <td className="px-4 py-3 text-titanium-600">{d.rate}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{d.ablation}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#C8D4DC] text-[#2C4A60]">{d.oac}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Quality Metrics
const EPQualityMetrics: React.FC = () => {
  const measures = [
    { measure: 'Anticoagulation in Eligible AFib (CHA2DS2-VASc ≥2)', rate: '89.4%', benchmark: '85%', above: true, source: 'NCDR LAAO' },
    { measure: 'DOAC Preferred Over Warfarin (non-valvular AFib)', rate: '93.2%', benchmark: '90%', above: true, source: 'PINNACLE' },
    { measure: 'AFib Ablation Freedom at 12 Months', rate: '73.4%', benchmark: '70%', above: true, source: 'Internal' },
    { measure: 'PFA Use for AFib Ablation', rate: '31.2%', benchmark: '—', above: true, source: 'Internal' },
    { measure: 'LAAC Closure at 45 Days', rate: '98.7%', benchmark: '98%', above: true, source: 'NCDR LAAO' },
    { measure: 'CRT Upgrade Rate (LBBB + HFrEF)', rate: '18.4%', benchmark: '—', above: false, source: 'Gap 10' },
    { measure: 'Device Battery ERI/EOL Timely Exchange', rate: '91.2%', benchmark: '95%', above: false, source: 'Gap 70' },
    { measure: 'Amiodarone Annual Thyroid/LFT Monitoring', rate: '64.3%', benchmark: '90%', above: false, source: 'Gap 33' },
    { measure: 'ICD Implant in DANISH-Eligible HF', rate: '71.8%', benchmark: '85%', above: false, source: 'Gap 22' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Above Benchmark</p><p className="text-3xl font-bold text-[#2C4A60]">5 / 9</p><p className="text-xs text-titanium-500 mt-1">Quality measures exceeding targets</p></div>
        <div className="metal-card p-5 border-l-4 border-l-red-400"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Below Benchmark</p><p className="text-3xl font-bold text-red-700">4 / 9</p><p className="text-xs text-titanium-500 mt-1">Device, amiodarone, ICD gaps</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">NCDR Submission</p><p className="text-3xl font-bold text-blue-700">100%</p><p className="text-xs text-titanium-500 mt-1">NCDR LAAO + PINNACLE current</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-[#2C4A60]" />
          <h3 className="text-base font-semibold text-titanium-900">EP Quality Measures — Current Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-titanium-50"><tr>{['Quality Measure', 'Rate', 'Benchmark', 'Status', 'Source'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-titanium-100">
              {measures.map((m, i) => (
                <tr key={i} className="hover:bg-titanium-50">
                  <td className="px-4 py-3 font-medium text-titanium-900">{m.measure}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-titanium-800">{m.rate}</td>
                  <td className="px-4 py-3 text-titanium-500">{m.benchmark}</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m.above ? 'bg-[#C8D4DC] text-[#2C4A60]' : 'bg-red-100 text-red-800'}`}>{m.above ? 'Above' : 'Below / Gap'}</span></td>
                  <td className="px-4 py-3 text-titanium-500 text-xs">{m.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// EP Device & Ablation Pipeline — powered by live gap detection data
const EPDeviceAblationPipeline: React.FC = () => {
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  const laacGap = EP_CLINICAL_GAPS.find(g => g.id === 'ep-gap-4-laac');
  const cspGap = EP_CLINICAL_GAPS.find(g => g.id === 'ep-gap-10-csp');
  const pfaGap = EP_CLINICAL_GAPS.find(g => g.id === 'ep-gap-11-pfa-reablation');
  const ilrGap = EP_CLINICAL_GAPS.find(g => g.id === 'ep-gap-65-ilr-cryptogenic-stroke');
  const flutterGap = EP_CLINICAL_GAPS.find(g => g.id === 'ep-gap-69-flutter-ablation');
  const batteryGap = EP_CLINICAL_GAPS.find(g => g.id === 'ep-gap-70-device-battery-eol');

  const totalLAAC = laacGap?.patientCount ?? 0;
  const totalCSP = cspGap?.patientCount ?? 0;
  const totalPFA = pfaGap?.patientCount ?? 0;
  const totalILR = ilrGap?.patientCount ?? 0;
  const totalFlutter = flutterGap?.patientCount ?? 0;
  const totalBattery = batteryGap?.patientCount ?? 0;
  const totalPipeline = totalLAAC + totalCSP + totalPFA + totalILR + totalFlutter + totalBattery;

  const renderPatient = (p: EPGapPatient, borderCls: string, bgCls: string) => {
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
                  <AlertTriangle className="w-3.5 h-3.5 text-[#6B7280] mt-0.5 flex-shrink-0" />
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
            {p.kccqOverallSummary !== undefined && (
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">KCCQ Patient-Reported Outcomes</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div><p className="text-xs text-slate-600">Overall Summary</p><p className="text-sm font-bold text-slate-900">{p.kccqOverallSummary}</p></div>
                  {p.kccqPhysicalLimitation !== undefined && <div><p className="text-xs text-slate-600">Physical Limitation</p><p className="text-sm font-bold text-slate-900">{p.kccqPhysicalLimitation}</p></div>}
                  {p.kccqQualityOfLife !== undefined && <div><p className="text-xs text-slate-600">Quality of Life</p><p className="text-sm font-bold text-slate-900">{p.kccqQualityOfLife}</p></div>}
                  {p.kccqSymptomFrequency !== undefined && <div><p className="text-xs text-slate-600">Symptom Frequency</p><p className="text-sm font-bold text-slate-900">{p.kccqSymptomFrequency}</p></div>}
                </div>
                {p.kccqPriorOverallSummary !== undefined && (
                  <p className="text-xs text-slate-600 mt-2">
                    Prior KCCQ: {p.kccqPriorOverallSummary} ({p.kccqPriorDate}) &rarr; Current: {p.kccqOverallSummary} ({p.kccqAdministeredDate}) &mdash; {p.kccqOverallSummary - p.kccqPriorOverallSummary > 0 ? '+' : ''}{p.kccqOverallSummary - p.kccqPriorOverallSummary} pts
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderGapSection = (
    gap: typeof laacGap,
    title: string,
    badge: string,
    badgeCls: string,
    borderCls: string,
    bgCls: string,
    iconEl: React.ReactNode
  ) => {
    if (!gap) return null;
    return (
      <div className={`metal-card bg-white border rounded-2xl p-6 ${borderCls}`}>
        <div className="flex items-start gap-3 mb-4">
          {iconEl}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-titanium-900">{title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeCls}`}>{badge}</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">{gap.patientCount} patients</span>
            </div>
            <p className="text-xs text-titanium-600 mt-1">{gap.evidence}</p>
            <p className="text-xs font-semibold text-[#2C4A60] mt-2">Action: {gap.cta}</p>
          </div>
        </div>
        {gap.safetyNote && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-red-800">{gap.safetyNote}</p>
          </div>
        )}
        <div className="space-y-2">
          {gap.patients.map(p => renderPatient(p, borderCls.replace('border-', 'border-').replace('border ', ''), bgCls))}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">LAAC Candidates</p>
          <p className="text-3xl font-bold text-blue-800">{totalLAAC}</p>
          <p className="text-xs text-titanium-500 mt-1">High CHA2DS2-VASc + OAC contraindication</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">CSP / CRT Evaluation</p>
          <p className="text-3xl font-bold text-blue-800">{totalCSP}</p>
          <p className="text-xs text-titanium-500 mt-1">CRT non-responders + device-naive LBBB</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">PFA Re-ablation</p>
          <p className="text-3xl font-bold text-blue-800">{totalPFA}</p>
          <p className="text-xs text-titanium-500 mt-1">AF recurrence post-ablation candidates</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-[#6B7280]">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Cryptogenic Stroke ILR</p>
          <p className="text-3xl font-bold text-[#6B7280]">{totalILR}</p>
          <p className="text-xs text-titanium-500 mt-1">ILR not ordered post-cryptogenic stroke</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Flutter Ablation</p>
          <p className="text-3xl font-bold text-blue-800">{totalFlutter}</p>
          <p className="text-xs text-titanium-500 mt-1">Typical flutter — CTI ablation not offered</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-red-500">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Device Battery ERI / EOL</p>
          <p className="text-3xl font-bold text-red-800">{totalBattery}</p>
          <p className="text-xs text-titanium-500 mt-1">Generator replacement needed — safety-critical</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Total EP Pipeline</p>
          <p className="text-3xl font-bold text-blue-800">{totalPipeline}</p>
          <p className="text-xs text-titanium-500 mt-1">Patients requiring device or ablation intervention</p>
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
            { label: 'Q1 2026', revenue: 3200000, procedures: 28 },
            { label: 'Q2 2026', revenue: 2400000, procedures: 21 },
            { label: 'Q3 2026', revenue: 1900000, procedures: 16 },
            { label: 'Q4 2026', revenue: 1400000, procedures: 12 },
          ].map((q, i) => (
            <div key={i} className="px-4 py-3 text-center">
              <div className="text-xs font-semibold text-titanium-500 uppercase">{q.label}</div>
              <div className="text-lg font-bold text-[#2C4A60] mt-1">{formatDollar(q.revenue)}</div>
              <div className="text-xs text-titanium-500">{q.procedures} procedures</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gap 4 — LAAC Candidates */}
      {renderGapSection(
        laacGap,
        'Gap 4: LAAC Candidates — OAC Contraindication + High CHA2DS2-VASc',
        'HIGH PRIORITY',
        'bg-blue-100 text-blue-800',
        'border-blue-200',
        'bg-blue-50',
        <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
      )}

      {/* Gap 10 — CSP/CRT */}
      {renderGapSection(
        cspGap,
        'Gap 10: Conduction System Pacing / CRT Evaluation',
        'HIGH PRIORITY',
        'bg-blue-100 text-blue-800',
        'border-blue-200',
        'bg-blue-50',
        <Activity className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
      )}

      {/* Gap 11 — PFA Re-ablation */}
      {renderGapSection(
        pfaGap,
        'Gap 11: PFA Re-ablation — AF Recurrence Post-Ablation',
        'GROWTH',
        'bg-[#C8D4DC] text-[#2C4A60]',
        'border-[#2C4A60]',
        'bg-[#C8D4DC]',
        <Zap className="w-5 h-5 text-[#2C4A60] mt-0.5 flex-shrink-0" />
      )}

      {/* Gap 65 — Cryptogenic Stroke ILR */}
      {renderGapSection(
        ilrGap,
        'Gap 65: Cryptogenic Stroke — Implantable Loop Recorder Not Ordered',
        'HIGH PRIORITY',
        'bg-[#F0F5FA] text-[#6B7280]',
        'border-[#C8D4DC]',
        'bg-[#F0F5FA]',
        <AlertTriangle className="w-5 h-5 text-[#6B7280] mt-0.5 flex-shrink-0" />
      )}

      {/* Gap 69 — Flutter Ablation */}
      {renderGapSection(
        flutterGap,
        'Gap 69: Typical Atrial Flutter — CTI Ablation Not Offered',
        'GROWTH',
        'bg-blue-100 text-blue-800',
        'border-blue-200',
        'bg-blue-50',
        <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
      )}

      {/* Gap 70 — Device Battery ERI/EOL */}
      {renderGapSection(
        batteryGap,
        'Gap 70: Device Battery at ERI/EOL — Generator Replacement Needed',
        'SAFETY',
        'bg-red-100 text-red-800',
        'border-red-200',
        'bg-red-50',
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
      )}

      {/* Automation callout */}
      <div className="metal-card bg-titanium-50 border border-titanium-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-[#2C4A60] mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-base font-semibold text-titanium-900 mb-1">Automated Pipeline Detection</h3>
            <p className="text-sm text-titanium-600">&#9889; Patients automatically identified from EHR integration</p>
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
              <div className="text-lg font-bold text-red-600">14 months</div>
              <div className="text-xs text-titanium-400">to clear pipeline</div>
            </div>
            <div className="bg-[#F0F5FA]/70 rounded-lg p-3">
              <div className="text-xs text-titanium-500 mb-1">Systematic Closure</div>
              <div className="text-lg font-bold text-[#2C4A60]">5 months</div>
              <div className="text-xs text-titanium-400">with TAILRD protocol</div>
            </div>
            <div className="bg-blue-50/70 rounded-lg p-3">
              <div className="text-xs text-titanium-500 mb-1">Revenue Acceleration</div>
              <div className="text-lg font-bold text-blue-600">{formatDollar(5400000)}</div>
              <div className="text-xs text-titanium-400">in 12 months</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Electrophysiology Service Line Tab Configuration
const electrophysiologyTabs: ServiceLineTabConfig[] = [
  {
 id: 'analytics',
 label: 'EP Analytics',
 icon: Target,
 description: 'Comprehensive electrophysiology analytics dashboard'
  },
  {
 id: 'heatmap',
 label: 'Patient Risk Heatmap',
 icon: Grid3X3,
 description: 'EP patient risk visualization matrix'
  },
  {
 id: 'procedures',
 label: 'Procedure Analytics',
 icon: BarChart3,
 description: 'AFib ablation, LAAC, and device procedure metrics'
  },
  {
 id: 'providers',
 label: 'Provider Performance',
 icon: Users,
 description: 'Electrophysiologist performance metrics and outcomes'
  },
  {
 id: 'arrhythmia',
 label: 'Arrhythmia Management',
 icon: Activity,
 description: 'Comprehensive arrhythmia treatment optimization'
  },
  {
 id: 'laac-risk',
 label: 'LAAC Risk Dashboard',
 icon: Heart,
 description: 'Left atrial appendage closure risk assessment'
  },
  {
 id: 'device-pipeline',
 label: 'Device & Ablation Pipeline',
 icon: Zap,
 description: 'EP device and ablation pipeline: LAAC, CSP/CRT, PFA re-ablation, cryptogenic stroke ILR, flutter ablation, device battery ERI/EOL — powered by live gap detection data'
  },
  {
 id: 'patient-details',
 label: 'Patient Detail Panel',
 icon: Users,
 description: 'Individual patient EP assessment and tracking'
  },
  {
 id: 'safety',
 label: 'Safety Screening',
 icon: Shield,
 description: 'Anticoagulation safety and contraindication screening'
  },
  {
 id: 'device-network',
 label: 'Device Network',
 icon: Network,
 description: 'EP device utilization and network analysis'
  },
  {
 id: 'network',
 label: 'Care Team Network',
 icon: Network,
 description: 'EP care team collaboration and referral patterns'
  },
  {
 id: 'clinical-support',
 label: 'Clinical Decision Support',
 icon: Brain,
 description: 'AI-powered EP clinical decision support tools'
  },
  {
 id: 'automated-support',
 label: 'Automated Support',
 icon: Zap,
 description: 'Automated EP clinical support and recommendations'
  },
  {
 id: 'quality',
 label: 'Quality Metrics',
 icon: Award,
 description: 'EP quality indicators and outcome measures'
  },
  {
 id: 'roi-calculator',
 label: 'ROI Calculator',
 icon: DollarSign,
 description: 'EP program financial impact and ROI calculator'
  },
  {
 id: 'reporting',
 label: 'Automated Reports',
 icon: FileText,
 description: 'Scheduled reporting and data exports'
  },
  {
 id: 'ep-outcomes-by-cohort',
 label: 'Outcomes by Cohort',
 icon: BarChart3,
 description: 'EP outcomes analysis segmented by patient cohort'
  },
  {
 id: 'ep-outcomes-trends',
 label: 'Outcomes Trends',
 icon: Activity,
 description: 'EP outcomes trends and longitudinal analysis'
  },
  {
 id: 'ep-phenotype-detection',
 label: 'Phenotype Detection',
 icon: Brain,
 description: 'EP phenotype detection and classification chart'
  },
  {
 id: 'ep-clinical-gap-detection',
 label: 'Gap Detection (20-Gap)',
 icon: Zap,
 description: 'AI-driven EP gap detection: LAAC, CSP/CRT, PFA re-ablation, CASTLE-AF, DANISH ICD, OSA-AF, WPW, amiodarone monitoring, OAC monotherapy (cross-module), persistent AF rhythm control, cryptogenic stroke ILR, dofetilide REMS safety, dronedarone contraindication, IST ivabradine, flutter ablation, device battery EOL safety, PVC cardiomyopathy, LQTS beta-blocker, carotid/stroke, Fontan All gap detection criteria, risk scores, and composite calculators are automatically computed from structured EHR data ingested via EHR integration — no manual data entry or chart review required.'
  }
];

// Export data configurations
const electrophysiologyExportData: Record<string, ExportData> = {
  providers: {
 headers: [
 'Provider Name',
 'Specialty',
 'AFib Ablations',
 'Device Implants',
 'Success Rate',
 'Complication Rate',
 'Quality Score'
 ],
 rows: [
 ['Dr. Michael Rodriguez', 'Electrophysiologist', '187', '234', '94.7%', '2.1%', '96.2'],
 ['Dr. Sarah Chen', 'Electrophysiologist', '203', '189', '96.1%', '1.8%', '97.4'],
 ['Dr. James Wilson', 'Electrophysiologist', '156', '267', '93.2%', '2.4%', '94.8'],
 ['Dr. Lisa Thompson', 'Electrophysiologist', '234', '156', '95.3%', '1.9%', '96.7'],
 ['Dr. David Park', 'Electrophysiologist', '178', '198', '94.1%', '2.2%', '95.1'],
 ['Dr. Amanda Martinez', 'Electrophysiologist', '145', '223', '92.8%', '2.6%', '94.3']
 ],
 filename: 'electrophysiology_provider_performance',
 title: 'Electrophysiology Provider Performance Report',
 metadata: {
 'Report Type': 'Provider Scorecard',
 'Service Line': 'Electrophysiology',
 'Period': 'Q4 2024',
 'Total Procedures': '2,370',
 'Avg Success Rate': '94.4%',
 'Avg Quality Score': '95.8'
 }
  },
  procedures: {
 headers: [
 'Procedure Type',
 'Volume',
 'Success Rate',
 'Recurrence Rate',
 'Complication Rate',
 'Cost per Case'
 ],
 rows: [
 ['AFib Ablation', '1,103', '89.7%', '15.2%', '2.1%', '$38,456'],
 ['AFL Ablation', '234', '94.9%', '8.3%', '1.4%', '$28,234'],
 ['VT Ablation', '156', '87.2%', '18.9%', '3.2%', '$45,891'],
 ['SVT Ablation', '189', '96.8%', '5.1%', '0.8%', '$22,567'],
 ['LAAC', '456', '96.1%', 'N/A', '2.8%', '$32,178'],
 ['Device Implant', '1,267', '98.4%', 'N/A', '1.6%', '$18,923']
 ],
 filename: 'electrophysiology_procedure_analytics',
 title: 'Electrophysiology Procedure Analytics Report',
 metadata: {
 'Report Type': 'Procedure Analytics',
 'Service Line': 'Electrophysiology',
 'Total Procedures': '3,405',
 'Overall Success Rate': '93.7%',
 'Overall Complication Rate': '2.0%'
 }
  }
};

// Electrophysiology Service Line Configuration
export const electrophysiologyServiceLineConfig: ServiceLineViewConfig = {
  moduleName: 'Electrophysiology',
  moduleDescription: 'Advanced EP analytics for procedures, devices, and clinical outcomes',
  moduleIcon: Zap,
  primaryColor: 'chrome-blue',
  tabs: electrophysiologyTabs,
  tabContent: {
 'analytics': ElectrophysiologyAnalytics,
 'heatmap': PatientRiskHeatmap,
 'procedures': EPProcedureAnalytics,
 'providers': EPProviderPerformance,
 'arrhythmia': ArrhythmiaManagement,
 'laac-risk': LAACRiskDashboard,
 'device-pipeline': EPDeviceAblationPipeline,
 'patient-details': PatientDetailPanel,
 'safety': AnticoagulationSafetyChecker,
 'device-network': EPDeviceNetworkVisualization,
 'network': CareTeamNetworkGraph,
 'clinical-support': EPClinicalDecisionSupport,
 'automated-support': EPAutomatedClinicalSupport,
 'quality': EPQualityMetrics,
 'roi-calculator': EPROICalculator,
 'reporting': AutomatedReportingSystem,
 'ep-outcomes-by-cohort': EPOutcomesByCohort,
 'ep-outcomes-trends': EPOutcomesTrends,
 'ep-phenotype-detection': EPPhenotypeDetectionChart,
 'ep-clinical-gap-detection': EPClinicalGapDetectionDashboard
  },
  exportData: electrophysiologyExportData,
  hasExport: true
};