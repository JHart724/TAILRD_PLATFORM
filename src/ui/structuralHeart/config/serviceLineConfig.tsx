import React, { useState } from 'react';
import { Users, Share, Activity, Award, Calculator, Heart, Target, Grid3X3, Shield, BarChart3, FileText, Network, AlertTriangle, ChevronDown, ChevronUp, Zap, TrendingUp, Clock } from 'lucide-react';
import { ServiceLineViewConfig } from '../../../components/shared/BaseServiceLineView';
import { ServiceLineTabConfig } from '../../../components/shared/StandardInterfaces';
import { ExportData } from '../../../utils/dataExport';
import { formatDollar } from '../../../utils/predictiveCalculators';

// Import existing Structural Heart Service Line components
import TAVRAnalyticsDashboard from '../components/TAVRAnalyticsDashboard';
import StructuralReferralNetworkVisualization from '../components/StructuralReferralNetworkVisualization';
import STSRiskCalculator from '../components/STSRiskCalculator';
import SHPhenotypeDetectionChart from '../components/SHPhenotypeDetectionChart';
import SHProviderScorecard from '../components/service-line/SHProviderScorecard';

// Import shared components
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';
import SHClinicalGapDetectionDashboard, { SH_CLINICAL_GAPS, SHGapPatient } from '../components/clinical/SHClinicalGapDetectionDashboard';

// Structural Heart Analytics Dashboard
const StructuralHeartAnalytics: React.FC = () => (
  <div className="space-y-6">
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">TAVR Procedures</h4>
 <div className="text-2xl font-bold text-titanium-900">1,287</div>
 <div className="text-sm text-[#2C4A60]">+18.4% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">MitraClip Procedures</h4>
 <div className="text-2xl font-bold text-titanium-900">456</div>
 <div className="text-sm text-[#2C4A60]">+22.7% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">TMVR Procedures</h4>
 <div className="text-2xl font-bold text-titanium-900">89</div>
 <div className="text-sm text-[#2C4A60]">+45.2% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">PVL Closures</h4>
 <div className="text-2xl font-bold text-titanium-900">67</div>
 <div className="text-sm text-[#2C4A60]">+12.3% vs last quarter</div>
 </div>
 </div>
 <div className="metal-card p-8">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Target className="w-5 h-5 text-medical-red-600" />
 Procedure Analytics
 </h3>
 <p className="text-titanium-600 mb-6">Comprehensive analytics for transcatheter structural heart interventions including TAVR, MitraClip, TMVR, tricuspid interventions, and paravalvular leak closures.</p>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* TAVR Outcomes */}
 <div className="bg-white border border-titanium-200 rounded-lg p-5">
   <h4 className="font-bold text-titanium-900 mb-4">TAVR Outcomes</h4>
   <div className="space-y-0 divide-y divide-titanium-100">
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">30-day Mortality</span><span className="text-sm font-semibold text-medical-red-700">2.1%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Procedural Success</span><span className="text-sm font-semibold text-titanium-900">96.8%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Transfemoral Access</span><span className="text-sm font-semibold text-titanium-900">94.2%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Avg LOS</span><span className="text-sm font-semibold text-titanium-900">4.2d</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Pacemaker Rate</span><span className="text-sm font-semibold text-medical-red-700">12.3%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Vascular Complications</span><span className="text-sm font-semibold text-medical-red-700">4.1%</span></div>
   </div>
 </div>
 {/* Mitral/Tricuspid */}
 <div className="bg-white border border-titanium-200 rounded-lg p-5">
   <h4 className="font-bold text-titanium-900 mb-4">Mitral/Tricuspid</h4>
   <div className="space-y-0 divide-y divide-titanium-100">
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">MitraClip Success</span><span className="text-sm font-semibold text-titanium-900">97.4%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">MR Reduction &le;2+</span><span className="text-sm font-semibold text-titanium-900">91.8%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">TMVR 30-day Mortality</span><span className="text-sm font-semibold text-medical-red-700">3.4%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Tricuspid Interventions</span><span className="text-sm font-semibold text-titanium-900">15</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">TEER Avg LOS</span><span className="text-sm font-semibold text-titanium-900">3.1d</span></div>
   </div>
 </div>
 {/* Heart Team Metrics */}
 <div className="bg-white border border-titanium-200 rounded-lg p-5">
   <h4 className="font-bold text-titanium-900 mb-4">Heart Team Metrics</h4>
   <div className="space-y-0 divide-y divide-titanium-100">
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Heart Team Review Rate</span><span className="text-sm font-semibold text-titanium-900">98.4%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">STS Score Concordance</span><span className="text-sm font-semibold text-titanium-900">94.1%</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Time to Decision</span><span className="text-sm font-semibold text-titanium-900">3.2d</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">Patients Discussed MTD</span><span className="text-sm font-semibold text-titanium-900">59</span></div>
     <div className="flex items-center justify-between py-2"><span className="text-sm text-titanium-600">TAVR-vs-SAVR Consensus</span><span className="text-sm font-semibold text-titanium-900">96.7%</span></div>
   </div>
 </div>
 </div>
 </div>
  </div>
);

// TAVR Candidate Pipeline — powered by live gap detection data (Gap 3 + Gap 79)
const TAVRCandidatePipeline: React.FC = () => {
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  const severeASGap = SH_CLINICAL_GAPS.find(g => g.id === 'sh-gap-3-asymp-severe-as');
  const moderateASGap = SH_CLINICAL_GAPS.find(g => g.id === 'sh-gap-79-moderate-as-surveillance');
  const postTavrGap = SH_CLINICAL_GAPS.find(g => g.id === 'sh-gap-80-post-tavr-echo');
  const bavGap = SH_CLINICAL_GAPS.find(g => g.id === 'sh-gap-82-bav-aortopathy');

  const totalSevereAS = severeASGap?.patientCount ?? 0;
  const totalModerateAS = moderateASGap?.patientCount ?? 0;
  const totalPostTavr = postTavrGap?.patientCount ?? 0;
  const totalBav = bavGap?.patientCount ?? 0;
  const totalPipeline = totalSevereAS + totalModerateAS + totalPostTavr + totalBav;

  const renderPatient = (p: SHGapPatient, borderCls: string, bgCls: string) => {
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

  return (
    <div className="space-y-6">
      {/* Pipeline KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-red-500">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Severe AS — TAVR Candidates</p>
          <p className="text-3xl font-bold text-red-800">{totalSevereAS}</p>
          <p className="text-xs text-titanium-500 mt-1">Asymptomatic severe AS, heart team review overdue</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-[#6B7280]">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Moderate AS — Surveillance Due</p>
          <p className="text-3xl font-bold text-[#6B7280]">{totalModerateAS}</p>
          <p className="text-xs text-titanium-500 mt-1">Echo overdue — risk of undetected progression to severe AS</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-[#6B7280]">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Post-TAVR Echo Overdue</p>
          <p className="text-3xl font-bold text-[#6B7280]">{totalPostTavr}</p>
          <p className="text-xs text-titanium-500 mt-1">30-day post-TAVR echo not performed (VARC-3)</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">BAV Aortopathy Monitoring</p>
          <p className="text-3xl font-bold text-blue-800">{totalBav}</p>
          <p className="text-xs text-titanium-500 mt-1">Aortic imaging overdue — dissection risk 8x baseline</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Total Structural Pipeline</p>
          <p className="text-3xl font-bold text-blue-800">{totalPipeline}</p>
          <p className="text-xs text-titanium-500 mt-1">Patients requiring active management or monitoring</p>
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
            { label: 'Q1 2026', revenue: 4100000, procedures: 18 },
            { label: 'Q2 2026', revenue: 3000000, procedures: 13 },
            { label: 'Q3 2026', revenue: 2200000, procedures: 10 },
            { label: 'Q4 2026', revenue: 1600000, procedures: 7 },
          ].map((q, i) => (
            <div key={i} className="px-4 py-3 text-center">
              <div className="text-xs font-semibold text-titanium-500 uppercase">{q.label}</div>
              <div className="text-lg font-bold text-[#2C4A60] mt-1">{formatDollar(q.revenue)}</div>
              <div className="text-xs text-titanium-500">{q.procedures} procedures</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gap 3 — Severe AS Active Candidates */}
      {severeASGap && (
        <div className="metal-card bg-white border border-red-200 rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-titanium-900">
                  Gap 3: Asymptomatic Severe AS — Heart Team Review Overdue
                </h3>
                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">HIGH PRIORITY</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">{totalSevereAS} patients</span>
              </div>
              <p className="text-xs text-titanium-600 mt-1">{severeASGap.evidence}</p>
              <p className="text-xs font-semibold text-red-700 mt-2">Action: {severeASGap.cta}</p>
            </div>
          </div>
          <div className="space-y-2">
            {severeASGap.patients.map(p => renderPatient(p, 'border-red-100', 'bg-red-50'))}
            {severeASGap.patientCount > severeASGap.patients.length && (
              <p className="text-center text-sm text-titanium-500 py-2">
                +{severeASGap.patientCount - severeASGap.patients.length} additional patients in the registry
              </p>
            )}
          </div>
        </div>
      )}

      {/* Gap 79 — Moderate AS Surveillance Pipeline */}
      {moderateASGap && (
        <div className="metal-card bg-white border border-[#C8D4DC] rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <Activity className="w-5 h-5 text-[#6B7280] mt-0.5 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-titanium-900">
                  Gap 79: Moderate AS — Echo Surveillance Overdue
                </h3>
                <span className="text-xs bg-[#F0F5FA] text-[#6B7280] px-2 py-0.5 rounded-full font-medium">SURVEILLANCE</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">{totalModerateAS} patients</span>
              </div>
              <p className="text-xs text-titanium-600 mt-1">{moderateASGap.evidence}</p>
              <p className="text-xs font-semibold text-[#6B7280] mt-2">Action: {moderateASGap.cta}</p>
            </div>
          </div>
          {moderateASGap.subcategories && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {moderateASGap.subcategories.map((sub, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-4 py-3 border ${i === 0 ? 'bg-red-50 border-red-200' : 'bg-[#F0F5FA] border-[#C8D4DC]'}`}
                >
                  <p className="text-sm font-bold text-titanium-900">{sub.count} patients</p>
                  <p className="text-xs text-titanium-600">{sub.label}</p>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {moderateASGap.patients.map(p => renderPatient(p, 'border-[#C8D4DC]', 'bg-[#F0F5FA]'))}
            {moderateASGap.patientCount > moderateASGap.patients.length && (
              <p className="text-center text-sm text-titanium-500 py-2">
                +{moderateASGap.patientCount - moderateASGap.patients.length} additional patients in the registry
              </p>
            )}
          </div>
        </div>
      )}

      {/* Gap 80 — Post-TAVR Echo Overdue */}
      {postTavrGap && (
        <div className="metal-card bg-white border border-[#C8D4DC] rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-[#6B7280] mt-0.5 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-titanium-900">
                  Gap 80: Post-TAVR Baseline Echo Missing
                </h3>
                <span className="text-xs bg-[#F0F5FA] text-[#6B7280] px-2 py-0.5 rounded-full font-medium">QUALITY GAP</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">{totalPostTavr} patients</span>
              </div>
              <p className="text-xs text-titanium-600 mt-1">{postTavrGap.evidence}</p>
              <p className="text-xs font-semibold text-[#6B7280] mt-2">Action: {postTavrGap.cta}</p>
            </div>
          </div>
          <div className="space-y-2">
            {postTavrGap.patients.map(p => renderPatient(p, 'border-[#C8D4DC]', 'bg-[#F0F5FA]'))}
            {postTavrGap.patientCount > postTavrGap.patients.length && (
              <p className="text-center text-sm text-titanium-500 py-2">
                +{postTavrGap.patientCount - postTavrGap.patients.length} additional patients in the registry
              </p>
            )}
          </div>
        </div>
      )}

      {/* Gap 82 — BAV Aortopathy */}
      {bavGap && (
        <div className="metal-card bg-white border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <Activity className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-titanium-900">
                  Gap 82: BAV Aortopathy — Aortic Imaging Overdue
                </h3>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">MONITORING</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">{totalBav} patients</span>
              </div>
              <p className="text-xs text-titanium-600 mt-1">{bavGap.evidence}</p>
              <p className="text-xs font-semibold text-blue-700 mt-2">Action: {bavGap.cta}</p>
            </div>
          </div>
          {bavGap.subcategories && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {bavGap.subcategories.map((sub, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-4 py-3 border ${i === 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}
                >
                  <p className="text-sm font-bold text-titanium-900">{sub.count} patients</p>
                  <p className="text-xs text-titanium-600">{sub.label}</p>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {bavGap.patients.map(p => renderPatient(p, 'border-blue-100', 'bg-blue-50'))}
            {bavGap.patientCount > bavGap.patients.length && (
              <p className="text-center text-sm text-titanium-500 py-2">
                +{bavGap.patientCount - bavGap.patients.length} additional patients in the registry
              </p>
            )}
          </div>
        </div>
      )}

      {/* Automation callout */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
        <Zap className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-blue-900 mb-1">Automated Structural Heart Pipeline Identification</h4>
          <p className="text-sm text-blue-800">&#9889; Patients automatically identified from EHR integration</p>
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
              <div className="text-lg font-bold text-red-600">15 months</div>
              <div className="text-xs text-titanium-400">to clear pipeline</div>
            </div>
            <div className="bg-[#F0F5FA]/70 rounded-lg p-3">
              <div className="text-xs text-titanium-500 mb-1">Systematic Closure</div>
              <div className="text-lg font-bold text-[#2C4A60]">5 months</div>
              <div className="text-xs text-titanium-400">with TAILRD protocol</div>
            </div>
            <div className="bg-blue-50/70 rounded-lg p-3">
              <div className="text-xs text-titanium-500 mb-1">Revenue Acceleration</div>
              <div className="text-lg font-bold text-blue-600">{formatDollar(4800000)}</div>
              <div className="text-xs text-titanium-400">in 12 months</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Structural Heart Procedure Analytics
const StructuralProcedureAnalytics: React.FC = () => {
  const procedures = [
    { type: 'TAVR (Transfemoral)', volume: 965, technical: '99.2%', pvl: '3.4%', stroke: '1.8%', los: '1.9d', mortality: '1.8%' },
    { type: 'TAVR (Alternative Access)', volume: 87, technical: '97.1%', pvl: '4.2%', stroke: '2.6%', los: '4.1d', mortality: '3.2%' },
    { type: 'MitraClip (TEER)', volume: 312, technical: '97.4%', pvl: '—', stroke: '1.3%', los: '2.4d', mortality: '2.3%' },
    { type: 'TMVR', volume: 89, technical: '94.4%', pvl: '5.1%', stroke: '3.4%', los: '6.2d', mortality: '3.4%' },
    { type: 'TriClip / TTVR (EVOQUE)', volume: 67, technical: '91.0%', pvl: '—', stroke: '2.9%', los: '3.8d', mortality: '4.5%' },
    { type: 'PVL Closure', volume: 156, technical: '96.8%', pvl: '—', stroke: '0.6%', los: '1.4d', mortality: '1.9%' },
    { type: 'ASD/VSD Closure', volume: 234, technical: '98.3%', pvl: '—', stroke: '0.4%', los: '1.2d', mortality: '0.8%' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-medical-red-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Total Procedures</p><p className="text-3xl font-bold text-titanium-900">1,910</p><p className="text-xs text-[#2C4A60] mt-1">+16.2% vs last quarter</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Overall Technical Success</p><p className="text-3xl font-bold text-[#2C4A60]">97.2%</p><p className="text-xs text-titanium-500 mt-1">Across all structural procedures</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">TAVR Transfemoral Rate</p><p className="text-3xl font-bold text-blue-700">91.7%</p><p className="text-xs text-[#2C4A60] mt-1">+2.4% vs last quarter</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#6B7280]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Avg TAVR LOS</p><p className="text-3xl font-bold text-[#6B7280]">2.1d</p><p className="text-xs text-[#2C4A60] mt-1">-0.3d vs last quarter</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-medical-red-600" />
          <h3 className="text-base font-semibold text-titanium-900">Structural Heart Procedure Analytics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-titanium-50"><tr>{['Procedure', 'Volume', 'Technical Success', 'PVL (mild+)', 'Stroke Rate', 'Avg LOS', '30-Day Mortality'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-titanium-100">
              {procedures.map((p, i) => (
                <tr key={i} className="hover:bg-titanium-50">
                  <td className="px-4 py-3 font-medium text-titanium-900">{p.type}</td>
                  <td className="px-4 py-3 font-mono font-semibold">{p.volume}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#C8D4DC] text-[#2C4A60]">{p.technical}</span></td>
                  <td className="px-4 py-3 text-titanium-600">{p.pvl}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#F0F5FA] text-[#6B7280]">{p.stroke}</span></td>
                  <td className="px-4 py-3 text-titanium-600">{p.los}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">{p.mortality}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Structural Heart Outcomes Analytics
const StructuralOutcomesAnalytics: React.FC = () => {
  const tavr = [
    { risk: 'Low Risk (STS <4%)', n: 523, mortality: '1.1%', stroke: '1.4%', pvl: '0.8%', oe: '0.71' },
    { risk: 'Intermediate (STS 4–8%)', n: 312, mortality: '2.1%', stroke: '2.2%', pvl: '1.2%', oe: '0.86' },
    { risk: 'High Risk (STS 8–15%)', n: 134, mortality: '4.8%', stroke: '3.1%', pvl: '2.4%', oe: '0.81' },
    { risk: 'Prohibitive (STS >15%)', n: 83, mortality: '9.6%', stroke: '4.4%', pvl: '3.8%', oe: '0.75' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Overall 30d Mortality</p><p className="text-3xl font-bold text-[#2C4A60]">1.8%</p><p className="text-xs text-titanium-500 mt-1">STS benchmark 2.4%</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">30d Stroke Rate</p><p className="text-3xl font-bold text-blue-700">2.0%</p><p className="text-xs text-titanium-500 mt-1">Nationwide avg 2.3%</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#6B7280]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Mod/Severe PVL Rate</p><p className="text-3xl font-bold text-[#6B7280]">1.3%</p><p className="text-xs text-[#2C4A60] mt-1">-0.2% vs last quarter</p></div>
        <div className="metal-card p-5 border-l-4 border-l-slate-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">New PPM Rate (TAVR)</p><p className="text-3xl font-bold text-slate-700">11.4%</p><p className="text-xs text-titanium-500 mt-1">Post-TAVR pacemaker</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-medical-red-600" />
          <h3 className="text-base font-semibold text-titanium-900">TAVR Outcomes by STS Risk Category</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-titanium-50"><tr>{['Risk Category', 'N', '30d Mortality', '30d Stroke', 'Mod/Severe PVL', 'O/E Mortality'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-titanium-100">
              {tavr.map((t, i) => (
                <tr key={i} className="hover:bg-titanium-50">
                  <td className="px-4 py-3 font-medium text-titanium-900">{t.risk}</td>
                  <td className="px-4 py-3 font-mono font-semibold">{t.n}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">{t.mortality}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#F0F5FA] text-[#6B7280]">{t.stroke}</span></td>
                  <td className="px-4 py-3 text-titanium-600">{t.pvl}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">O/E: {t.oe}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Structural Heart Risk Calculators
const StructuralRiskCalculators: React.FC = () => (
  <div className="space-y-8">
    <STSRiskCalculator />
    <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
      <h3 className="text-base font-semibold text-titanium-900 mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-medical-red-600" />
        Additional Risk Stratification Tools
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-titanium-50 border border-titanium-200 rounded-xl p-4">
          <h4 className="font-semibold text-titanium-900 mb-1">EuroSCORE II</h4>
          <p className="text-sm text-titanium-600 mb-3">European System for Cardiac Operative Risk Evaluation — used alongside STS for valve procedures</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white rounded-lg p-2"><p className="text-titanium-500">Low Risk</p><p className="font-semibold text-[#2C4A60]">&lt;2%</p></div>
            <div className="bg-white rounded-lg p-2"><p className="text-titanium-500">Intermediate</p><p className="font-semibold text-[#6B7280]">2–10%</p></div>
            <div className="bg-white rounded-lg p-2"><p className="text-titanium-500">High Risk</p><p className="font-semibold text-red-700">&gt;10%</p></div>
            <div className="bg-white rounded-lg p-2"><p className="text-titanium-500">Very High</p><p className="font-semibold text-red-900">&gt;20%</p></div>
          </div>
        </div>
        <div className="bg-titanium-50 border border-titanium-200 rounded-xl p-4">
          <h4 className="font-semibold text-titanium-900 mb-1">Frailty Assessment</h4>
          <p className="text-sm text-titanium-600 mb-3">Essential adjunct to STS score — poor frailty predicts post-TAVR outcomes independent of surgical risk</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white rounded-lg p-2"><p className="text-titanium-500">5m Gait Speed</p><p className="font-semibold text-titanium-800">≥0.83 m/s = non-frail</p></div>
            <div className="bg-white rounded-lg p-2"><p className="text-titanium-500">Grip Strength</p><p className="font-semibold text-titanium-800">Measured in kg</p></div>
            <div className="bg-white rounded-lg p-2"><p className="text-titanium-500">Katz ADL Score</p><p className="font-semibold text-titanium-800">6 = independent</p></div>
            <div className="bg-white rounded-lg p-2"><p className="text-titanium-500">Serum Albumin</p><p className="font-semibold text-titanium-800">≥3.5 g/dL normal</p></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Provider Performance Scorecard
const StructuralProviderScorecard: React.FC = () => {
  const providers = [
    { name: 'Dr. Sarah Rodriguez', specialty: 'Interventional Cardiologist', tavrVol: 198, mitraclipVol: 67, successRate: '98.5%', complications: '2.1%', quality: 97.8 },
    { name: 'Dr. Michael Chen', specialty: 'Cardiac Surgeon', tavrVol: 156, mitraclipVol: 89, successRate: '97.4%', complications: '3.2%', quality: 95.6 },
    { name: 'Dr. Lisa Thompson', specialty: 'Interventional Cardiologist', tavrVol: 187, mitraclipVol: 45, successRate: '98.9%', complications: '1.6%', quality: 98.2 },
    { name: 'Dr. James Wilson', specialty: 'Cardiac Surgeon', tavrVol: 134, mitraclipVol: 78, successRate: '96.3%', complications: '4.1%', quality: 94.1 },
    { name: 'Dr. Amanda Park', specialty: 'Interventional Cardiologist', tavrVol: 167, mitraclipVol: 52, successRate: '97.6%', complications: '2.4%', quality: 96.7 },
    { name: 'Dr. David Martinez', specialty: 'Cardiac Surgeon', tavrVol: 123, mitraclipVol: 61, successRate: '95.9%', complications: '3.8%', quality: 94.8 },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-medical-red-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Heart Team Members</p><p className="text-3xl font-bold text-titanium-900">6</p><p className="text-xs text-titanium-500 mt-1">Interventional cardiologists &amp; cardiac surgeons</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#2C4A60]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Avg Procedural Success</p><p className="text-3xl font-bold text-[#2C4A60]">97.4%</p><p className="text-xs text-titanium-500 mt-1">Across TAVR and MitraClip</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Total Procedures</p><p className="text-3xl font-bold text-blue-700">1,357</p><p className="text-xs text-titanium-500 mt-1">TAVR + MitraClip this quarter</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-medical-red-600" />
          <h3 className="text-base font-semibold text-titanium-900">Structural Heart Provider Performance Scorecard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-titanium-50"><tr>{['Provider', 'Specialty', 'TAVR Vol.', 'MitraClip Vol.', 'Success Rate', 'Complications', 'Quality Score'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-titanium-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-titanium-100">
              {providers.map((p, i) => (
                <tr key={i} className="hover:bg-titanium-50">
                  <td className="px-4 py-3 font-semibold text-titanium-900">{p.name}</td>
                  <td className="px-4 py-3 text-titanium-600">{p.specialty}</td>
                  <td className="px-4 py-3 text-center font-mono">{p.tavrVol}</td>
                  <td className="px-4 py-3 text-center font-mono">{p.mitraclipVol}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#C8D4DC] text-[#2C4A60]">{p.successRate}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#F0F5FA] text-[#6B7280]">{p.complications}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="flex-1 bg-titanium-100 rounded-full h-2"><div className="bg-medical-red-500 h-2 rounded-full" style={{ width: `${p.quality}%` }} /></div><span className="text-xs font-semibold text-titanium-700">{p.quality}</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Safety Screening
const StructuralSafetyScreening: React.FC = () => {
  const alerts = [
    { category: 'Pre-TAVR CT Anatomy Not Yet Reviewed', count: 34, action: 'CT aortic root + access analysis required', severity: 'red' as const },
    { category: 'Post-TAVR Echo Overdue >30 Days (Gap 80)', count: 67, action: 'Post-TAVR echo within 30 days per ACC/AHA', severity: 'amber' as const },
    { category: 'Rheumatic MS on DOAC (Gap 81)', count: 23, action: 'Switch to warfarin — DOACs contraindicated in rheumatic MS', severity: 'red' as const },
    { category: 'Anticoagulation Bridge Planning Needed', count: 45, action: 'Structural pharmacist review required', severity: 'amber' as const },
    { category: 'STS Score Not Calculated (TAVR Candidate)', count: 18, action: 'Complete STS PROM before heart team presentation', severity: 'red' as const },
    { category: 'Frailty Screen Not Completed (TAVR Candidate)', count: 22, action: 'Gait speed + ADL assessment required', severity: 'amber' as const },
    { category: 'Endocarditis Prophylaxis Protocol Absent (Gap 83)', count: 31, action: 'Amoxicillin/alternative regimen required pre-dental', severity: 'amber' as const },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metal-card p-5 border-l-4 border-l-red-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">High-Severity Alerts</p><p className="text-3xl font-bold text-red-800">75</p><p className="text-xs text-titanium-500 mt-1">Requiring immediate action</p></div>
        <div className="metal-card p-5 border-l-4 border-l-[#6B7280]"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Moderate Alerts</p><p className="text-3xl font-bold text-[#6B7280]">165</p><p className="text-xs text-titanium-500 mt-1">Protocol review required</p></div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500"><p className="text-xs font-semibold text-titanium-600 uppercase tracking-wide mb-1">Pre-Procedural Screens</p><p className="text-3xl font-bold text-blue-700">312</p><p className="text-xs text-titanium-500 mt-1">Completed this month</p></div>
      </div>
      <div className="metal-card bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-titanium-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-medical-red-600" />
          <h3 className="text-base font-semibold text-titanium-900">Active Safety Alerts — Structural Heart</h3>
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

// Structural Heart Service Line Tab Configuration
const structuralHeartTabs: ServiceLineTabConfig[] = [
  {
 id: 'analytics',
 label: 'Structural Analytics',
 icon: Target,
 description: 'Comprehensive structural heart intervention analytics'
  },
  {
 id: 'heatmap',
 label: 'Patient Risk Heatmap',
 icon: Grid3X3,
 description: 'Structural heart patient risk visualization matrix'
  },
  {
 id: 'candidates',
 label: 'Candidate Assessment',
 icon: Users,
 description: 'TAVR candidate pipeline: 52 severe AS flagged for heart team review, 134 moderate AS surveillance overdue (Gap 3 + Gap 79)'
  },
  {
 id: 'providers',
 label: 'Provider Performance',
 icon: Share,
 description: 'Interventionalist and surgeon performance metrics'
  },
  {
 id: 'calculators',
 label: 'Risk Calculators',
 icon: Calculator,
 description: 'STS, EuroSCORE, and structural heart risk tools'
  },
  {
 id: 'sts-calculator',
 label: 'STS Calculator',
 icon: Calculator,
 description: 'Society of Thoracic Surgeons risk assessment tool'
  },
  {
 id: 'procedure-analytics',
 label: 'Procedure Analytics',
 icon: BarChart3,
 description: 'TAVR, MitraClip, and procedural performance metrics'
  },
  {
 id: 'outcomes',
 label: 'Outcomes Analytics',
 icon: Award,
 description: 'Risk-stratified outcomes and benchmark analysis'
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
 description: 'Heart team collaboration and referral patterns'
  },
  {
 id: 'referral-network',
 label: 'Referral Network',
 icon: Activity,
 description: 'Structural heart referral network and patient flow'
  },
  {
 id: 'tavr-analytics',
 label: 'TAVR Analytics',
 icon: Heart,
 description: 'Specialized TAVR program analytics dashboard'
  },
  {
 id: 'reporting',
 label: 'Automated Reports',
 icon: FileText,
 description: 'Scheduled reporting and registry submissions'
  },
  {
 id: 'sh-phenotype-detection',
 label: 'Phenotype Detection',
 icon: Heart,
 description: 'Structural heart phenotype detection and classification'
  },
  {
 id: 'sh-provider-scorecard',
 label: 'Provider Scorecard',
 icon: Award,
 description: 'Structural heart provider performance scorecard'
  },
  {
 id: 'sh-clinical-gap-detection',
 label: 'Gap Detection (8-Gap)',
 icon: Target,
 description: 'AI-driven structural gap detection: Gap 3 (Severe AS), Gap 5 (Functional MR/COAPT), Gap 8 (Tricuspid), Gap 79 (Moderate AS surveillance), Gap 80 (Post-TAVR echo), Gap 81 (Rheumatic MS warfarin safety), Gap 82 (BAV aortopathy), Gap 83 (Endocarditis prophylaxis) All gap detection criteria, risk scores, and composite calculators are automatically computed from structured EHR data ingested via EHR integration — no manual data entry or chart review required.'
  }
];

// Export data configurations
const structuralHeartExportData: Record<string, ExportData> = {
  providers: {
 headers: [
 'Provider Name',
 'Specialty',
 'TAVR Volume',
 'MitraClip Volume',
 'Success Rate',
 'Complication Rate',
 'Quality Score'
 ],
 rows: [
 ['Dr. Sarah Rodriguez', 'Interventional Cardiologist', '198', '67', '98.5%', '2.1%', '97.8'],
 ['Dr. Michael Chen', 'Cardiac Surgeon', '156', '89', '97.4%', '3.2%', '95.6'],
 ['Dr. Lisa Thompson', 'Interventional Cardiologist', '187', '45', '98.9%', '1.6%', '98.2'],
 ['Dr. James Wilson', 'Cardiac Surgeon', '134', '78', '96.3%', '4.1%', '94.1'],
 ['Dr. Amanda Park', 'Interventional Cardiologist', '167', '52', '97.6%', '2.4%', '96.7'],
 ['Dr. David Martinez', 'Cardiac Surgeon', '123', '61', '95.9%', '3.8%', '94.8']
 ],
 filename: 'structural_heart_provider_performance',
 title: 'Structural Heart Provider Performance Report',
 metadata: {
 'Report Type': 'Provider Scorecard',
 'Service Line': 'Structural Heart',
 'Period': 'Q4 2024',
 'Total Procedures': '1,357',
 'Avg Success Rate': '97.4%',
 'Avg Quality Score': '96.2'
 }
  },
  procedures: {
 headers: [
 'Procedure Type',
 'Volume',
 'Technical Success',
 'Device Success',
 '30-Day Mortality',
 'Cost per Case'
 ],
 rows: [
 ['TAVR', '965', '99.2%', '96.8%', '1.8%', '$47,892'],
 ['MitraClip', '392', '97.4%', '89.3%', '2.3%', '$42,156'],
 ['TMVR', '89', '94.4%', '87.6%', '3.4%', '$78,234'],
 ['Tricuspid Intervention', '67', '91.0%', '82.1%', '4.5%', '$52,891'],
 ['PVL Closure', '156', '96.8%', '91.7%', '1.9%', '$28,456'],
 ['Aortic VSD Closure', '234', '98.3%', '94.4%', '0.8%', '$18,734']
 ],
 filename: 'structural_heart_procedure_analytics',
 title: 'Structural Heart Procedure Analytics Report',
 metadata: {
 'Report Type': 'Procedure Analytics',
 'Service Line': 'Structural Heart',
 'Total Procedures': '1,903',
 'Overall Technical Success': '97.2%',
 'Overall 30-Day Mortality': '2.1%'
 }
  }
};

// Structural Heart Service Line Configuration
export const structuralHeartServiceLineConfig: ServiceLineViewConfig = {
  moduleName: 'Structural Heart',
  moduleDescription: 'Advanced structural heart analytics for TAVR, MitraClip, and transcatheter interventions',
  moduleIcon: Heart,
  primaryColor: 'medical-red',
  tabs: structuralHeartTabs,
  tabContent: {
 'analytics': StructuralHeartAnalytics,
 'heatmap': PatientRiskHeatmap,
 'candidates': TAVRCandidatePipeline,
 'providers': StructuralProviderScorecard,
 'calculators': StructuralRiskCalculators,
 'sts-calculator': STSRiskCalculator,
 'procedure-analytics': StructuralProcedureAnalytics,
 'outcomes': StructuralOutcomesAnalytics,
 'safety': StructuralSafetyScreening,
 'network': CareTeamNetworkGraph,
 'referral-network': StructuralReferralNetworkVisualization,
 'tavr-analytics': TAVRAnalyticsDashboard,
 'reporting': AutomatedReportingSystem,
 'sh-phenotype-detection': SHPhenotypeDetectionChart,
 'sh-provider-scorecard': SHProviderScorecard,
 'sh-clinical-gap-detection': SHClinicalGapDetectionDashboard
  },
  exportData: structuralHeartExportData,
  hasExport: true
};