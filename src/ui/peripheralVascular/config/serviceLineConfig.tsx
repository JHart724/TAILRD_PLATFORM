import React, { useState } from 'react';
import { Activity, FileText, Network, Target, Users, Calculator, Shield, BarChart3, Award, Grid3X3, MapPin, Heart, ChevronDown, ChevronUp, AlertTriangle, Zap, TrendingUp, Clock } from 'lucide-react';
import { ServiceLineViewConfig } from '../../../components/shared/BaseServiceLineView';
import { ServiceLineTabConfig } from '../../../components/shared/StandardInterfaces';
import { ExportData } from '../../../utils/dataExport';
import { formatDollar } from '../../../utils/predictiveCalculators';

// Import existing Peripheral Vascular Service Line components
import PADReportingSystem from '../components/PADReportingSystem';
import PVWoundCareNetworkVisualization from '../components/PVWoundCareNetworkVisualization';
import WIfIClassification from '../components/WIfIClassification';
import LimbSalvageScreening from '../components/LimbSalvageScreening';

// Import shared components
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';
import PVClinicalGapDetectionDashboard, { PV_CLINICAL_GAPS, PVGapPatient } from '../components/clinical/PVClinicalGapDetectionDashboard';

// Peripheral Vascular Analytics Dashboard
const PeripheralVascularAnalytics: React.FC = () => (
  <div className="space-y-6">
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">PAD Interventions</h4>
 <div className="text-2xl font-bold text-titanium-900">1,456</div>
 <div className="text-sm text-[#2C4A60]">+11.2% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">Limb Salvage Cases</h4>
 <div className="text-2xl font-bold text-titanium-900">287</div>
 <div className="text-sm text-[#2C4A60]">+18.4% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">CLI Revascularizations</h4>
 <div className="text-2xl font-bold text-titanium-900">392</div>
 <div className="text-sm text-[#2C4A60]">+15.7% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">Wound Healing Rate</h4>
 <div className="text-2xl font-bold text-titanium-900">78.3%</div>
 <div className="text-sm text-[#2C4A60]">+4.1% vs last quarter</div>
 </div>
 </div>
 <div className="metal-card p-8">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Target className="w-5 h-5 text-arterial-600" />
 Procedure Analytics
 </h3>
 <p className="text-titanium-600 mb-6">Comprehensive peripheral arterial disease (PAD) analytics including endovascular interventions, surgical bypass, wound care coordination, and limb salvage outcomes.</p>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Endovascular Outcomes */}
 <div className="bg-white border border-titanium-200 rounded-lg p-5">
   <h4 className="font-bold text-titanium-900 mb-4">Endovascular Outcomes</h4>
   <div className="space-y-0 divide-y divide-titanium-100">
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Technical Success</span><span className="text-sm font-semibold text-titanium-900">96.8%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">1yr Primary Patency</span><span className="text-sm font-semibold text-titanium-900">78.6%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">DCB Use (Fem-Pop)</span><span className="text-sm font-semibold text-titanium-900">78.4%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Iliac Patency 1yr</span><span className="text-sm font-semibold text-titanium-900">84.2%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">BTK CLI Salvage</span><span className="text-sm font-semibold text-titanium-900">86.4%</span></div>
   </div>
 </div>
 {/* Limb Salvage Program */}
 <div className="bg-white border border-titanium-200 rounded-lg p-5">
   <h4 className="font-bold text-titanium-900 mb-4">Limb Salvage Program</h4>
   <div className="space-y-0 divide-y divide-titanium-100">
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Limb Salvage Rate</span><span className="text-sm font-semibold text-arterial-700">85%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">CLI Referral-to-Revasc</span><span className="text-sm font-semibold text-titanium-900">12.4d</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Major Amputation Rate</span><span className="text-sm font-semibold text-titanium-900">3.2%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Wound Healing Rate</span><span className="text-sm font-semibold text-titanium-900">78.3%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">30-day Mortality</span><span className="text-sm font-semibold text-titanium-900">1.8%</span></div>
   </div>
 </div>
 {/* Wound Care Network */}
 <div className="bg-white border border-titanium-200 rounded-lg p-5">
   <h4 className="font-bold text-titanium-900 mb-4">Wound Care Network</h4>
   <div className="space-y-0 divide-y divide-titanium-100">
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Active Wound Patients</span><span className="text-sm font-semibold text-titanium-900">89</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Avg Healing Time</span><span className="text-sm font-semibold text-titanium-900">42d</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Multidisciplinary Reviews MTD</span><span className="text-sm font-semibold text-titanium-900">34</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Podiatry Referral Rate</span><span className="text-sm font-semibold text-titanium-900">94.2%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">WIfI Stage 4 Cases</span><span className="text-sm font-semibold text-arterial-700">12</span></div>
   </div>
 </div>
 </div>
 </div>
  </div>
);

// Provider Performance Scorecard
const PeripheralVascularProviderScorecard: React.FC = () => {
  const providers = [
    { name: 'Dr. James Martinez', specialty: 'Vascular Surgeon', endoVol: 0, surgVol: 156, limbSalvage: '88.4%', patency1yr: '82.3%', quality: 96.1 },
    { name: 'Dr. Sarah Chen', specialty: 'Interventional Radiologist', endoVol: 234, surgVol: 0, limbSalvage: '91.2%', patency1yr: '79.4%', quality: 95.4 },
    { name: 'Dr. Michael Park', specialty: 'Vascular Surgeon', endoVol: 89, surgVol: 112, limbSalvage: '87.6%', patency1yr: '84.1%', quality: 97.2 },
    { name: 'Dr. Lisa Thompson', specialty: 'Interventional Radiologist', endoVol: 198, surgVol: 0, limbSalvage: '89.7%', patency1yr: '77.8%', quality: 94.8 },
    { name: 'Dr. Robert Kim', specialty: 'Vascular Surgeon', endoVol: 67, surgVol: 134, limbSalvage: '85.9%', patency1yr: '80.6%', quality: 95.7 },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-arterial-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Total Providers</p><p className="text-3xl font-bold text-titanium-900">5</p><p className="text-xs text-titanium-500 mt-1">Vascular surgeons &amp; interventionalists</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Avg Limb Salvage Rate</p><p className="text-3xl font-bold text-[#2C4A60]">88.6%</p><p className="text-xs text-titanium-500 mt-1">CLI patients at 12 months</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Total Procedures</p><p className="text-3xl font-bold text-blue-700">990</p><p className="text-xs text-titanium-500 mt-1">Endovascular + surgical this quarter</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-arterial-600" />
          <h3 className="text-base font-semibold text-titanium-900">PV Provider Performance Scorecard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-titanium-50"><tr>{['Provider', 'Specialty', 'Endovascular Vol.', 'Surgical Vol.', 'Limb Salvage', '1yr Patency', 'Quality Score'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-titanium-100">
              {providers.map((p, i) => (
                <tr key={i} className="hover:bg-titanium-50">
                  <td className="px-4 py-3 font-semibold text-titanium-900">{p.name}</td>
                  <td className="px-4 py-3 text-titanium-600">{p.specialty}</td>
                  <td className="px-4 py-3 text-center font-mono">{p.endoVol > 0 ? p.endoVol : '—'}</td>
                  <td className="px-4 py-3 text-center font-mono">{p.surgVol > 0 ? p.surgVol : '—'}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#C8D4DC] text-[#2C4A60]">{p.limbSalvage}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{p.patency1yr}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="flex-1 bg-titanium-100 rounded-full h-2"><div className="bg-arterial-500 h-2 rounded-full" style={{ width: `${p.quality}%` }} /></div><span className="text-xs font-semibold text-titanium-700">{p.quality}</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// PAD Risk Calculators
const PADRiskCalculators: React.FC = () => (
  <div className="space-y-8">
    <WIfIClassification />
  </div>
);

// Intervention Analytics
const PADInterventionAnalytics: React.FC = () => {
  const procedures = [
    { type: 'Iliac Angioplasty/Stent', volume: 312, technical: '97.4%', patency1yr: '84.2%', complications: '2.1%', avgLos: '1.4d' },
    { type: 'Femoropopliteal (DCB)', volume: 287, technical: '96.2%', patency1yr: '78.6%', complications: '2.4%', avgLos: '1.6d' },
    { type: 'Below-the-Knee Endovascular (CLI)', volume: 234, technical: '89.3%', patency1yr: '58.4%', complications: '3.8%', avgLos: '3.2d' },
    { type: 'Aortobifemoral Bypass', volume: 89, technical: '98.9%', patency1yr: '91.3%', complications: '4.5%', avgLos: '6.8d' },
    { type: 'Fem-Pop Bypass (PTFE)', volume: 112, technical: '97.3%', patency1yr: '72.1%', complications: '3.9%', avgLos: '5.4d' },
    { type: 'Carotid Endarterectomy', volume: 178, technical: '99.4%', patency1yr: '96.2%', complications: '1.7%', avgLos: '1.8d' },
    { type: 'EVAR', volume: 134, technical: '98.5%', patency1yr: '93.4%', complications: '2.2%', avgLos: '2.1d' },
    { type: 'Renal Artery Stenting', volume: 110, technical: '97.3%', patency1yr: '82.7%', complications: '2.7%', avgLos: '1.2d' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-arterial-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Total Interventions</p><p className="text-3xl font-bold text-titanium-900">1,456</p><p className="text-xs text-[#2C4A60] mt-1">+11.2% vs last quarter</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Technical Success</p><p className="text-3xl font-bold text-[#2C4A60]">96.8%</p><p className="text-xs text-titanium-500 mt-1">Across all interventions</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">DCB Use (Fem-Pop)</p><p className="text-3xl font-bold text-blue-700">78.4%</p><p className="text-xs text-[#2C4A60] mt-1">+9.3% vs last quarter</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#6B7280]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">CLI Limb Salvage</p><p className="text-3xl font-bold text-[#6B7280]">86.4%</p><p className="text-xs text-[#2C4A60] mt-1">+2.1% vs last quarter</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-arterial-600" />
          <h3 className="text-base font-semibold text-titanium-900">PAD Intervention Analytics by Procedure Type</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-titanium-50"><tr>{['Procedure Type', 'Volume', 'Technical Success', '1yr Patency', 'Complications', 'Avg LOS'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-titanium-100">
              {procedures.map((p, i) => (
                <tr key={i} className="hover:bg-titanium-50">
                  <td className="px-4 py-3 font-medium text-titanium-900">{p.type}</td>
                  <td className="px-4 py-3 font-mono font-semibold">{p.volume}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#C8D4DC] text-[#2C4A60]">{p.technical}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{p.patency1yr}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#F0F5FA] text-[#6B7280]">{p.complications}</span></td>
                  <td className="px-4 py-3 text-titanium-600">{p.avgLos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// CLI Management
const CLIManagement: React.FC = () => {
  const stages = [
    { stage: 'Referred — Awaiting Evaluation', patients: 67, wifiHigh: 34, avgWait: '4.2 days', urgency: 'red' as const },
    { stage: 'Evaluated — Revascularization Planned', patients: 48, wifiHigh: 29, avgWait: '6.8 days', urgency: 'amber' as const },
    { stage: 'Post-Revascularization Healing', patients: 134, wifiHigh: 22, avgWait: '—', urgency: 'green' as const },
    { stage: 'Wound Care — No Revascularization Option', patients: 38, wifiHigh: 38, avgWait: '—', urgency: 'red' as const },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-red-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Active CLI Patients</p><p className="text-3xl font-bold text-red-800">287</p><p className="text-xs text-titanium-500 mt-1">Critical limb ischemia program</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#6B7280]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">WIfI High-Risk</p><p className="text-3xl font-bold text-[#6B7280]">123</p><p className="text-xs text-titanium-500 mt-1">WIfI Stage 3-4 (major amp. risk)</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Limb Salvage Rate</p><p className="text-3xl font-bold text-[#2C4A60]">86.4%</p><p className="text-xs text-titanium-500 mt-1">12-month amputation-free survival</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Revascularization Rate</p><p className="text-3xl font-bold text-blue-700">79.1%</p><p className="text-xs text-titanium-500 mt-1">Among evaluated CLI patients</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-arterial-600" />
          <h3 className="text-base font-semibold text-titanium-900">CLI Patient Pipeline by Stage</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-titanium-50"><tr>{['Pipeline Stage', 'Patients', 'WIfI High-Risk', 'Avg Time to Next Step', 'Urgency'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-titanium-100">
            {stages.map((s, i) => (
              <tr key={i} className="hover:bg-titanium-50">
                <td className="px-4 py-3 font-medium text-titanium-900">{s.stage}</td>
                <td className="px-4 py-3 font-mono font-semibold">{s.patients}</td>
                <td className="px-4 py-3 font-mono text-red-700">{s.wifiHigh}</td>
                <td className="px-4 py-3 text-titanium-600">{s.avgWait}</td>
                <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.urgency === 'red' ? 'bg-red-100 text-red-800' : s.urgency === 'amber' ? 'bg-[#F0F5FA] text-[#6B7280]' : 'bg-[#C8D4DC] text-[#2C4A60]'}`}>{s.urgency === 'red' ? 'Urgent' : s.urgency === 'amber' ? 'Active' : 'Monitoring'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Safety Screening
const PADSafetyScreening: React.FC = () => {
  const alerts = [
    { category: 'Contrast Nephropathy Risk (eGFR <45)', count: 134, action: 'Pre-hydration protocol + eGFR review', severity: 'amber' as const },
    { category: 'Anticoagulation Bridging Needed', count: 67, action: 'Hematology/pharmacy review required', severity: 'red' as const },
    { category: 'Metformin Hold Pre-Contrast (eGFR <60)', count: 89, action: 'Hold 48h pre/post procedure', severity: 'amber' as const },
    { category: 'HIT History — Alternative AC Required', count: 12, action: 'Argatroban or bivalirudin required', severity: 'red' as const },
    { category: 'High Cumulative Radiation Dose', count: 23, action: 'Radiation safety review prior to procedure', severity: 'amber' as const },
    { category: 'IVC Filter — No Anticoagulation (Gap 86)', count: 47, action: 'Anticoagulation initiation assessment', severity: 'red' as const },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-red-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">High-Severity Alerts</p><p className="text-3xl font-bold text-red-800">126</p><p className="text-xs text-titanium-500 mt-1">Requiring immediate action</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#6B7280]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Moderate Alerts</p><p className="text-3xl font-bold text-[#6B7280]">246</p><p className="text-xs text-titanium-500 mt-1">Requiring protocol review</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Screened This Month</p><p className="text-3xl font-bold text-[#2C4A60]">487</p><p className="text-xs text-titanium-500 mt-1">Pre-procedural safety checks</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-arterial-600" />
          <h3 className="text-base font-semibold text-titanium-900">Active Safety Alerts — PV Procedures</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-titanium-50"><tr>{['Safety Category', 'Patients', 'Required Action', 'Severity'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-titanium-100">
            {alerts.map((a, i) => (
              <tr key={i} className="hover:bg-titanium-50">
                <td className="px-4 py-3 font-medium text-titanium-900">{a.category}</td>
                <td className="px-4 py-3 font-mono font-semibold">{a.count}</td>
                <td className="px-4 py-3 text-titanium-600 text-xs">{a.action}</td>
                <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${a.severity === 'red' ? 'bg-red-100 text-red-800' : 'bg-[#F0F5FA] text-[#6B7280]'}`}>{a.severity === 'red' ? 'High' : 'Moderate'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Quality Metrics
const PADQualityMetrics: React.FC = () => {
  const measures = [
    { measure: 'Antiplatelet Therapy at Discharge (PAD)', rate: '96.8%', benchmark: '95%', above: true, registry: 'SVS-VQI' },
    { measure: 'Statin Therapy (all PAD)', rate: '89.3%', benchmark: '90%', above: false, registry: 'SVS-VQI' },
    { measure: 'Supervised Exercise Therapy Referral', rate: '38.4%', benchmark: '60%', above: false, registry: 'Gap 25' },
    { measure: '30-Day EVAR Reintervention Rate', rate: '3.2%', benchmark: '5%', above: true, registry: 'SVS-VQI' },
    { measure: 'Carotid Stroke/TIA Rate (CEA/CAS)', rate: '0.8%', benchmark: '2%', above: true, registry: 'SVS-VQI' },
    { measure: 'Venous Compression Therapy (Ulcer)', rate: '52.1%', benchmark: '75%', above: false, registry: 'Gap 84' },
    { measure: 'ABI Documented (New PAD Dx)', rate: '74.3%', benchmark: '80%', above: false, registry: 'Gap 24' },
    { measure: 'Smoking Cessation Counseling (PAD)', rate: '81.4%', benchmark: '80%', above: true, registry: 'SVS-VQI' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Above Benchmark</p><p className="text-3xl font-bold text-[#2C4A60]">4 / 8</p><p className="text-xs text-titanium-500 mt-1">SVS-VQI quality measures</p></div>
        <div className="metal-card p-5 border-l-4 border-l-red-400"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Below Benchmark</p><p className="text-3xl font-bold text-red-700">4 / 8</p><p className="text-xs text-titanium-500 mt-1">Exercise therapy, statin, ABI, compression gaps</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">SVS-VQI Submission</p><p className="text-3xl font-bold text-blue-700">100%</p><p className="text-xs text-titanium-500 mt-1">Vascular Quality Initiative current</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-arterial-600" />
          <h3 className="text-base font-semibold text-titanium-900">PV Quality Measures — Current Performance</h3>
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
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m.above ? 'bg-[#C8D4DC] text-[#2C4A60]' : 'bg-red-100 text-red-800'}`}>{m.above ? 'Above Benchmark' : 'Below Benchmark'}</span></td>
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

// ============================================================
// Vascular Pipeline — powered by PV Clinical Gap Detection Data
// Gaps 24 (ABI), 28 (AAA), 38 (Post-EVAR), 34 (TCAR/Carotid), 85 (VTE)
// ============================================================
const PVVascularPipeline: React.FC = () => {
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  const abiGap = PV_CLINICAL_GAPS.find(g => g.id === 'pv-gap-24-abi-screening');
  const aaaGap = PV_CLINICAL_GAPS.find(g => g.id === 'pv-gap-28-aaa-screening');
  const tcarGap = PV_CLINICAL_GAPS.find(g => g.id === 'pv-gap-34-pad-dual-pathway-no-cad');
  const vteGap = PV_CLINICAL_GAPS.find(g => g.id === 'pv-gap-85-unprovoked-vte');

  // Post-EVAR surveillance — inline data (not yet in gap detection system)
  const postEvarCount = 41;
  const postEvarPatients: PVGapPatient[] = [
    { id: 'PV-EVAR-001', name: 'Gerald Hutchins', mrn: 'MRN-PV-38001', age: 74, signals: ['EVAR 14 months ago -- no surveillance CT angiography performed', 'SVS guidelines: CTA at 1, 6, 12 months post-EVAR, then annually', 'Endoleak risk: Type II endoleak in 10-25% of EVAR patients'], keyValues: { 'EVAR Date': '14 months ago', 'Last CTA': 'None post-EVAR', 'Endoleak Risk': 'Not assessed', 'Aneurysm Sac': 'Not followed', 'SVS Compliance': 'Non-compliant' } },
    { id: 'PV-EVAR-002', name: 'Dorothy Engel', mrn: 'MRN-PV-38002', age: 79, signals: ['EVAR 26 months ago -- last CTA at 6 months only', 'Annual surveillance CTA overdue by 8 months', 'Graft migration and sac expansion not assessed'], keyValues: { 'EVAR Date': '26 months ago', 'Last CTA': '20 months ago', 'Surveillance Gap': '8 months overdue', 'Graft Type': 'Endurant II', 'Priority': 'HIGH' } },
    { id: 'PV-EVAR-003', name: 'Raymond Kolb', mrn: 'MRN-PV-38003', age: 71, signals: ['EVAR 18 months ago -- 12-month CTA overdue', 'Known Type II endoleak at 6-month CTA', 'Sac growth monitoring essential -- intervention if >5mm growth'], keyValues: { 'EVAR Date': '18 months ago', 'Last CTA': '12 months ago', 'Known Endoleak': 'Type II (6-month CTA)', 'Sac Size at 6mo': '5.2cm', 'Priority': 'URGENT' } },
  ];

  const abiCount = abiGap?.patientCount ?? 0;
  const aaaCount = aaaGap?.patientCount ?? 0;
  const tcarCount = tcarGap?.patientCount ?? 0;
  const vteCount = vteGap?.patientCount ?? 0;
  const totalPipeline = abiCount + aaaCount + postEvarCount + tcarCount + vteCount;

  const renderPatient = (p: PVGapPatient, borderCls: string, bgCls: string) => {
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
          </div>
        )}
      </div>
    );
  };

  const renderGapSection = (
    gap: { name: string; evidence: string; cta: string; patients: PVGapPatient[]; patientCount: number; subcategories?: { label: string; count: number }[] } | undefined,
    title: string,
    patients: PVGapPatient[],
    patientCount: number,
    borderColor: string,
    bgColor: string,
    icon: React.ReactNode,
    badgeColor: string,
    badgeLabel: string
  ) => (
    <div className={`metal-card bg-white border ${borderColor} rounded-2xl p-6`}>
      <div className="flex items-start gap-3 mb-4">
        {icon}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-titanium-900">{title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>{badgeLabel}</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">{patientCount} patients</span>
          </div>
          {gap && <p className="text-xs text-titanium-600 mt-1">{gap.evidence}</p>}
          {gap && <p className="text-xs font-semibold text-arterial-700 mt-2">Action: {gap.cta}</p>}
        </div>
      </div>
      {gap?.subcategories && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {gap.subcategories.map((sub, i) => (
            <div key={i} className={`rounded-lg px-4 py-3 border ${i === 0 ? 'bg-red-50 border-red-200' : 'bg-[#F0F5FA] border-[#C8D4DC]'}`}>
              <p className="text-sm font-bold text-titanium-900">{sub.count} patients</p>
              <p className="text-xs text-titanium-600">{sub.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {patients.map(p => renderPatient(p, borderColor.replace('border-', 'border-').replace('border ', ''), bgColor))}
        {patientCount > patients.length && (
          <p className="text-center text-sm text-titanium-500 py-2">
            +{patientCount - patients.length} additional patients in the registry
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Pipeline KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-[#6B7280]">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">ABI Screening Needed</p>
          <p className="text-3xl font-bold text-[#6B7280]">{abiCount}</p>
          <p className="text-xs text-titanium-500 mt-1">PAD patients without documented ABI</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-[#6B7280]">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">AAA Screening Needed</p>
          <p className="text-3xl font-bold text-[#6B7280]">{aaaCount}</p>
          <p className="text-xs text-titanium-500 mt-1">Eligible men 65-75 without AAA US</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-[#6B7280]">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Post-EVAR Surveillance Overdue</p>
          <p className="text-3xl font-bold text-[#6B7280]">{postEvarCount}</p>
          <p className="text-xs text-titanium-500 mt-1">CTA surveillance overdue per SVS guidelines</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">TCAR/Carotid Candidates</p>
          <p className="text-3xl font-bold text-blue-800">{tcarCount}</p>
          <p className="text-xs text-titanium-500 mt-1">PAD dual-pathway eligible, no CAD</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-[#6B7280]">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Unprovoked VTE Extended Anticoag</p>
          <p className="text-3xl font-bold text-[#6B7280]">{vteCount}</p>
          <p className="text-xs text-titanium-500 mt-1">Extended anticoagulation assessment needed</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Total Vascular Pipeline</p>
          <p className="text-3xl font-bold text-blue-800">{totalPipeline}</p>
          <p className="text-xs text-titanium-500 mt-1">Patients requiring active management</p>
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
            { label: 'Q1 2026', revenue: 1800000, procedures: 22 },
            { label: 'Q2 2026', revenue: 1300000, procedures: 16 },
            { label: 'Q3 2026', revenue: 1000000, procedures: 12 },
            { label: 'Q4 2026', revenue: 700000, procedures: 9 },
          ].map((q, i) => (
            <div key={i} className="px-4 py-3 text-center">
              <div className="text-xs font-semibold text-titanium-500 uppercase">{q.label}</div>
              <div className="text-lg font-bold text-[#2C4A60] mt-1">{formatDollar(q.revenue)}</div>
              <div className="text-xs text-titanium-500">{q.procedures} procedures</div>
            </div>
          ))}
        </div>
      </div>

      {/* Automation callout */}
      <div className="metal-card bg-gradient-to-r from-arterial-50 to-blue-50 border border-arterial-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-arterial-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-titanium-900">Automated Vascular Pipeline Detection</h4>
            <p className="text-xs text-titanium-600 mt-1">&#9889; Patients automatically identified from EHR integration</p>
          </div>
        </div>
      </div>

      {/* Gap 24 -- ABI Screening */}
      {abiGap && renderGapSection(
        abiGap,
        'Gap 24: ABI Screening -- PAD Patients Without Documented ABI',
        abiGap.patients,
        abiGap.patientCount,
        'border-[#C8D4DC]',
        'bg-[#F0F5FA]',
        <Activity className="w-5 h-5 text-[#6B7280] mt-0.5 flex-shrink-0" />,
        'bg-[#F0F5FA] text-[#6B7280]',
        'SCREENING GAP'
      )}

      {/* Gap 28 -- AAA Screening */}
      {aaaGap && renderGapSection(
        aaaGap,
        'Gap 28: AAA Screening -- Eligible Men Without Abdominal Aortic Aneurysm US',
        aaaGap.patients,
        aaaGap.patientCount,
        'border-[#C8D4DC]',
        'bg-[#F0F5FA]',
        <Activity className="w-5 h-5 text-[#6B7280] mt-0.5 flex-shrink-0" />,
        'bg-[#F0F5FA] text-[#6B7280]',
        'SCREENING GAP'
      )}

      {/* Gap 38 -- Post-EVAR Surveillance */}
      {renderGapSection(
        { name: 'Post-EVAR Surveillance Overdue', evidence: 'SVS guidelines: CTA at 1, 6, 12 months post-EVAR then annually. Type II endoleak occurs in 10-25% of cases. Sac expansion >5mm from baseline triggers reintervention evaluation. Elective EVAR mortality <2% vs emergency rupture mortality 50-80%.', cta: 'Schedule Post-EVAR Surveillance CTA', patients: postEvarPatients, patientCount: postEvarCount },
        'Gap 38: Post-EVAR Surveillance -- CTA Imaging Overdue',
        postEvarPatients,
        postEvarCount,
        'border-[#C8D4DC]',
        'bg-[#F0F5FA]',
        <AlertTriangle className="w-5 h-5 text-[#6B7280] mt-0.5 flex-shrink-0" />,
        'bg-[#F0F5FA] text-[#6B7280]',
        'SURVEILLANCE'
      )}

      {/* Gap 34 -- TCAR/Carotid Candidates */}
      {tcarGap && renderGapSection(
        tcarGap,
        'Gap 34: TCAR/Carotid Candidates -- PAD Dual Pathway Eligible',
        tcarGap.patients,
        tcarGap.patientCount,
        'border-blue-200',
        'bg-blue-50',
        <Target className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />,
        'bg-blue-100 text-blue-800',
        'GROWTH OPPORTUNITY'
      )}

      {/* Gap 85 -- Unprovoked VTE */}
      {vteGap && renderGapSection(
        vteGap,
        'Gap 85: Unprovoked VTE -- Extended Anticoagulation Assessment',
        vteGap.patients,
        vteGap.patientCount,
        'border-[#C8D4DC]',
        'bg-[#F0F5FA]',
        <AlertTriangle className="w-5 h-5 text-[#6B7280] mt-0.5 flex-shrink-0" />,
        'bg-[#F0F5FA] text-[#6B7280]',
        'TREATMENT GAP'
      )}

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
              <div className="text-lg font-bold text-red-600">20 months</div>
              <div className="text-xs text-titanium-400">to clear pipeline</div>
            </div>
            <div className="bg-[#F0F5FA]/70 rounded-lg p-3">
              <div className="text-xs text-titanium-500 mb-1">Systematic Closure</div>
              <div className="text-lg font-bold text-[#2C4A60]">7 months</div>
              <div className="text-xs text-titanium-400">with TAILRD protocol</div>
            </div>
            <div className="bg-blue-50/70 rounded-lg p-3">
              <div className="text-xs text-titanium-500 mb-1">Revenue Acceleration</div>
              <div className="text-lg font-bold text-blue-600">{formatDollar(3600000)}</div>
              <div className="text-xs text-titanium-400">in 12 months</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Peripheral Vascular Service Line Tab Configuration
const peripheralVascularTabs: ServiceLineTabConfig[] = [
  {
 id: 'analytics',
 label: 'PAD Analytics',
 icon: Target,
 description: 'Comprehensive peripheral arterial disease analytics dashboard'
  },
  {
 id: 'heatmap',
 label: 'Patient Risk Heatmap',
 icon: Grid3X3,
 description: 'PAD patient risk visualization matrix'
  },
  {
 id: 'providers',
 label: 'Provider Performance',
 icon: Users,
 description: 'Vascular surgeon and interventionalist performance metrics'
  },
  {
 id: 'calculators',
 label: 'Risk Calculators',
 icon: Calculator,
 description: 'WIfI, ABI, and GLASS classification tools'
  },
  {
 id: 'wifi',
 label: 'WIfI Classification',
 icon: MapPin,
 description: 'Wound, Ischemia, foot Infection assessment tool'
  },
  {
 id: 'interventions',
 label: 'Intervention Analytics',
 icon: BarChart3,
 description: 'Endovascular and surgical PAD procedure metrics'
  },
  {
 id: 'cli-management',
 label: 'CLI Management',
 icon: Heart,
 description: 'Critical limb ischemia and limb salvage analytics'
  },
  {
 id: 'limb-salvage',
 label: 'Limb Salvage',
 icon: Activity,
 description: 'Limb salvage screening and outcome tracking'
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
 description: 'Vascular care team collaboration and referral patterns'
  },
  {
 id: 'wound-care-network',
 label: 'Wound Care Network',
 icon: Network,
 description: 'Wound care coordination and network analysis'
  },
  {
 id: 'quality',
 label: 'Quality Metrics',
 icon: Award,
 description: 'VQI Registry, quality indicators, and outcome measures'
  },
  {
 id: 'reporting',
 label: 'PAD Reporting',
 icon: FileText,
 description: 'Automated PAD reporting and registry submissions'
  },
  {
 id: 'vascular-pipeline',
 label: 'Vascular Pipeline',
 icon: Target,
 description: 'Vascular pipeline: ABI screening, AAA screening, post-EVAR surveillance, TCAR/carotid candidates, and unprovoked VTE extended anticoagulation -- powered by clinical gap detection data'
  },
  {
 id: 'pv-clinical-gap-detection',
 label: 'Gap Detection (12-Gap)',
 icon: Activity,
 description: 'AI-driven PV gap detection: COMPASS dual-pathway, ABI screening, supervised exercise therapy, AAA screening, PAD dual-pathway no CAD, renal artery stenosis, mesenteric ischemia, cilostazol underuse, venous ulcer compression, unprovoked VTE anticoagulation, IVC filter without AC safety, May-Thurner syndrome All gap detection criteria, risk scores, and composite calculators are automatically computed from structured EHR data ingested via EHR integration — no manual data entry or chart review required.'
  }
];

// Export data configurations
const peripheralVascularExportData: Record<string, ExportData> = {
  providers: {
 headers: [
 'Provider Name',
 'Specialty',
 'PAD Volume',
 'Success Rate',
 'Patency Rate',
 'Limb Salvage Rate',
 'Quality Score'
 ],
 rows: [
 ['Dr. Maria Rodriguez', 'Vascular Surgeon', '187', '96.8%', '89.2%', '85.4%', '94.7'],
 ['Dr. James Chen', 'Interventional Radiologist', '234', '97.4%', '91.3%', '82.1%', '95.8'],
 ['Dr. Sarah Wilson', 'Vascular Surgeon', '156', '95.9%', '87.6%', '88.9%', '93.4'],
 ['Dr. Michael Park', 'Interventional Cardiologist', '198', '96.1%', '90.7%', '79.3%', '94.2'],
 ['Dr. Lisa Thompson', 'Vascular Surgeon', '142', '97.2%', '88.4%', '91.2%', '95.1'],
 ['Dr. David Martinez', 'Interventional Radiologist', '167', '95.7%', '89.8%', '83.6%', '93.8']
 ],
 filename: 'peripheral_vascular_provider_performance',
 title: 'Peripheral Vascular Provider Performance Report',
 metadata: {
 'Report Type': 'Provider Scorecard',
 'Service Line': 'Peripheral Vascular',
 'Period': 'Q4 2024',
 'Total Procedures': '1,084',
 'Avg Success Rate': '96.5%',
 'Avg Limb Salvage Rate': '85.1%'
 }
  },
  interventions: {
 headers: [
 'Intervention Type',
 'Volume',
 'Technical Success',
 'Patency at 12 months',
 'Complication Rate',
 'Cost per Case'
 ],
 rows: [
 ['Balloon Angioplasty', '456', '97.8%', '76.4%', '2.1%', '$8,234'],
 ['Stent Placement', '387', '98.2%', '84.7%', '3.2%', '$12,567'],
 ['Atherectomy', '189', '96.3%', '81.2%', '4.1%', '$15,891'],
 ['Drug-Coated Balloon', '234', '97.1%', '88.9%', '2.8%', '$11,234'],
 ['Bypass Surgery', '156', '95.5%', '91.3%', '6.7%', '$28,456'],
 ['Hybrid Procedures', '87', '94.2%', '89.1%', '5.4%', '$22,178']
 ],
 filename: 'peripheral_vascular_intervention_analytics',
 title: 'Peripheral Vascular Intervention Analytics Report',
 metadata: {
 'Report Type': 'Intervention Analytics',
 'Service Line': 'Peripheral Vascular',
 'Total Interventions': '1,509',
 'Overall Technical Success': '96.8%',
 'Avg 12-month Patency': '85.3%'
 }
  }
};

// Peripheral Vascular Service Line Configuration
export const peripheralVascularServiceLineConfig: ServiceLineViewConfig = {
  moduleName: 'Peripheral Vascular',
  moduleDescription: 'Advanced PAD analytics for interventions, wound care coordination, and limb salvage',
  moduleIcon: Activity,
  primaryColor: 'arterial',
  tabs: peripheralVascularTabs,
  tabContent: {
 'analytics': PeripheralVascularAnalytics,
 'heatmap': PatientRiskHeatmap,
 'providers': PeripheralVascularProviderScorecard,
 'calculators': PADRiskCalculators,
 'wifi': WIfIClassification,
 'interventions': PADInterventionAnalytics,
 'cli-management': CLIManagement,
 'limb-salvage': LimbSalvageScreening,
 'safety': PADSafetyScreening,
 'network': CareTeamNetworkGraph,
 'wound-care-network': PVWoundCareNetworkVisualization,
 'quality': PADQualityMetrics,
 'reporting': PADReportingSystem,
 'vascular-pipeline': PVVascularPipeline,
 'pv-clinical-gap-detection': PVClinicalGapDetectionDashboard
  },
  exportData: peripheralVascularExportData,
  hasExport: true
};