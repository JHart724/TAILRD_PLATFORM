import React, { useState } from 'react';
import { Target, Grid3X3, Stethoscope, BarChart3, Activity, Search, Heart, Network, Users, FileText, Shield, ChevronDown, ChevronUp, Zap, AlertTriangle, Info, TrendingUp, Clock } from 'lucide-react';
import { ServiceLineViewConfig } from '../../../components/shared/BaseServiceLineView';
import { ServiceLineTabConfig } from '../../../components/shared/StandardInterfaces';
import { ExportData } from '../../../utils/dataExport';

// Import HF clinical gap data for pipeline (from dedicated data file to avoid circular dependency)
import { HF_CLINICAL_GAPS, HFGapPatient } from '../components/clinical/hfGapData';
import { estimateINTERMACS } from '../../../utils/clinicalCalculators';
import { formatDollar } from '../../../utils/predictiveCalculators';

// Import existing Heart Failure Service Line components
import ProviderScorecard from '../components/service-line/ProviderScorecard';
import GDMTAnalyticsDashboard from '../components/service-line/GDMTAnalyticsDashboard';
import DevicePathwayFunnel from '../components/service-line/DevicePathwayFunnel';
import QualityMetricsDashboard from '../components/service-line/QualityMetricsDashboard';
import HFPhenotypeClassification from '../components/clinical/HFPhenotypeClassification';
import GDMTContraindicationChecker from '../components/clinical/GDMTContraindicationChecker';
import SpecialtyPhenotypesDashboard from '../components/clinical/SpecialtyPhenotypesDashboard';
import AdvancedDeviceTracker from '../components/clinical/AdvancedDeviceTracker';
import HFCareNetworkVisualization from '../components/service-line/HFCareNetworkVisualization';
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';
import ClinicalGapDetectionDashboard from '../components/clinical/ClinicalGapDetectionDashboard';
import KCCQOutcomesPanel from '../components/service-line/KCCQOutcomesPanel';
import PhenotypeDetectionChart from '../components/PhenotypeDetectionChart';

// ── Advanced Therapy Pipeline ────────────────────────────────────────────
const HFAdvancedTherapyPipeline: React.FC = () => {
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  const cardiomemsGap = HF_CLINICAL_GAPS.find(g => g.id === 'hf-gap-13-cardiomems');
  const rpmGap = HF_CLINICAL_GAPS.find(g => g.id === 'hf-gap-29-rpm');
  const palliativeGap = HF_CLINICAL_GAPS.find(g => g.id === 'hf-gap-76-palliative-care');
  const diureticResistGap = HF_CLINICAL_GAPS.find(g => g.id === 'hf-gap-77-diuretic-resistance');

  const cardiomemsCount = cardiomemsGap?.patientCount ?? 0;
  const rpmCount = rpmGap?.patientCount ?? 0;
  const barostimCount = 34;
  const advancedReferralCount = palliativeGap?.patientCount ?? 0;
  const totalPipeline = cardiomemsCount + rpmCount + barostimCount + advancedReferralCount;

  const renderPatient = (p: HFGapPatient, borderCls: string, bgCls: string) => {
    const isOpen = expandedPatient === p.id;
    const kccqCurrent = p.kccqOverallSummary;
    const kccqPrior = p.kccqPriorOverallSummary;
    const kccqTrend =
      kccqCurrent != null && kccqPrior != null
        ? kccqCurrent - kccqPrior
        : null;

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
                  <p className="text-sm font-semibold text-titanium-900">{String(v)}</p>
                </div>
              ))}
            </div>
            {kccqCurrent != null && (
              <div className="mt-3 flex items-center gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span className="text-xs text-blue-800 font-medium">
                    KCCQ-OS: {kccqCurrent}
                    {kccqTrend != null && (
                      <span className={kccqTrend >= 0 ? 'text-green-700 ml-1' : 'text-red-700 ml-1'}>
                        ({kccqTrend >= 0 ? '+' : ''}{kccqTrend} from prior)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
            {(() => {
              const signalsLower = p.signals.map(s => s.toLowerCase()).join(' ');
              const onInotrope = signalsLower.includes('inotrope');
              const outpatient = signalsLower.includes('outpatient');
              const nyhaMatch = signalsLower.match(/nyha\s+(class\s+)?(\w+)/i);
              const nyhaMap: Record<string, number> = { 'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, '1': 1, '2': 2, '3': 3, '4': 4 };
              const nyhaClass = nyhaMatch ? nyhaMap[nyhaMatch[2].toLowerCase()] : undefined;
              const lvefStr = String(p.keyValues['LVEF'] || '');
              const lvefNum = parseFloat(lvefStr);
              const hospStr = String(p.keyValues['Hospitalizations'] || p.keyValues['Recent Hospitalizations'] || '');
              const hospNum = parseInt(hospStr, 10);
              const intermacsResult = estimateINTERMACS({
                onInotrope,
                inotropeOutpatient: onInotrope && outpatient,
                nyhaClass,
                lvef: isNaN(lvefNum) ? undefined : lvefNum,
                recentHospitalizations: isNaN(hospNum) ? undefined : hospNum,
              });
              return (
                <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                  <span className="text-xs text-slate-800 font-medium">
                    INTERMACS {intermacsResult.label}
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
    gap: typeof HF_CLINICAL_GAPS[number] | undefined,
    label: string,
    borderColor: string,
    bgColor: string,
    badgeColor: string,
    icon: React.ReactNode,
    priorityLabel: string
  ) => {
    if (!gap) return null;
    return (
      <div className={`metal-card bg-white border ${borderColor} rounded-2xl p-6`}>
        <div className="flex items-start gap-3 mb-4">
          {icon}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-titanium-900">{gap.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>{priorityLabel}</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">{gap.patientCount} patients</span>
            </div>
            <p className="text-xs text-titanium-600 mt-1">{gap.evidence}</p>
            <p className={`text-xs font-semibold mt-2 ${borderColor.includes('red') ? 'text-red-700' : borderColor.includes('amber') ? 'text-amber-700' : 'text-blue-700'}`}>Action: {gap.cta}</p>
          </div>
        </div>
        <div className="space-y-2">
          {gap.patients.map(p => renderPatient(p, borderColor, bgColor))}
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
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">CardioMEMS Eligible</p>
          <p className="text-3xl font-bold text-blue-800">{cardiomemsCount}</p>
          <p className="text-xs text-titanium-500 mt-1">NYHA III + HF hospitalization in 12 mo</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-amber-400">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">RPM Enrollment Pending</p>
          <p className="text-3xl font-bold text-amber-800">{rpmCount}</p>
          <p className="text-xs text-titanium-500 mt-1">HF eligible, not enrolled in RPM</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Barostim Candidates</p>
          <p className="text-3xl font-bold text-blue-800">{barostimCount}</p>
          <p className="text-xs text-titanium-500 mt-1">Advanced HFrEF, neuromodulation eligible</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-red-500">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Advanced HF Referral Needed</p>
          <p className="text-3xl font-bold text-red-800">{advancedReferralCount}</p>
          <p className="text-xs text-titanium-500 mt-1">Stage D HF - palliative / MCS evaluation</p>
        </div>
        <div className="metal-card p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Total Advanced HF Pipeline</p>
          <p className="text-3xl font-bold text-blue-800">{totalPipeline}</p>
          <p className="text-xs text-titanium-500 mt-1">Patients requiring advanced therapy triage</p>
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
            { label: 'Q1 2026', revenue: 2800000, procedures: 23 },
            { label: 'Q2 2026', revenue: 2100000, procedures: 18 },
            { label: 'Q3 2026', revenue: 1600000, procedures: 14 },
            { label: 'Q4 2026', revenue: 1200000, procedures: 10 },
          ].map((q, i) => (
            <div key={i} className="px-4 py-3 text-center">
              <div className="text-xs font-semibold text-titanium-500 uppercase">{q.label}</div>
              <div className="text-lg font-bold text-emerald-700 mt-1">{formatDollar(q.revenue)}</div>
              <div className="text-xs text-titanium-500">{q.procedures} procedures</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gap 13 — CardioMEMS */}
      {renderGapSection(
        cardiomemsGap,
        'CardioMEMS Eligible',
        'border-blue-200',
        'bg-blue-50',
        'bg-blue-100 text-blue-800',
        <Activity className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />,
        'GROWTH'
      )}

      {/* Gap 29 — RPM */}
      {renderGapSection(
        rpmGap,
        'RPM Enrollment',
        'border-amber-200',
        'bg-amber-50',
        'bg-amber-100 text-amber-800',
        <Activity className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />,
        'GROWTH'
      )}

      {/* Gap 77 — Diuretic Resistance (advanced therapy pathway) */}
      {renderGapSection(
        diureticResistGap,
        'Diuretic Resistance',
        'border-amber-200',
        'bg-amber-50',
        'bg-amber-100 text-amber-800',
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />,
        'HIGH PRIORITY'
      )}

      {/* Gap 76 — Palliative Care / Advanced HF Referral */}
      {renderGapSection(
        palliativeGap,
        'Advanced HF Referral',
        'border-red-200',
        'bg-red-50',
        'bg-red-100 text-red-800',
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />,
        'HIGH PRIORITY'
      )}

      {/* Automation callout */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
        <Zap className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-blue-900 mb-1">Automated Advanced Therapy Triage</h4>
          <p className="text-sm text-blue-800">&#9889; Patients automatically identified from EHR data via Redox</p>
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
              <div className="text-lg font-bold text-red-600">16 months</div>
              <div className="text-xs text-titanium-400">to clear pipeline</div>
            </div>
            <div className="bg-emerald-50/70 rounded-lg p-3">
              <div className="text-xs text-titanium-500 mb-1">Systematic Closure</div>
              <div className="text-lg font-bold text-emerald-600">5 months</div>
              <div className="text-xs text-titanium-400">with TAILRD protocol</div>
            </div>
            <div className="bg-blue-50/70 rounded-lg p-3">
              <div className="text-xs text-titanium-500 mb-1">Revenue Acceleration</div>
              <div className="text-lg font-bold text-blue-600">{formatDollar(6000000)}</div>
              <div className="text-xs text-titanium-400">in 12 months</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Heart Failure Service Line Tab Configuration
const heartFailureTabs: ServiceLineTabConfig[] = [
  {
 id: 'gdmt',
 label: 'GDMT Analytics',
 icon: Target,
 description: 'Real-time 4-pillar optimization dashboard'
  },
  {
 id: 'heatmap',
 label: 'Patient Risk Heatmap',
 icon: Grid3X3,
 description: 'Interactive risk visualization matrix'
  },
  {
 id: 'providers',
 label: 'Provider Performance',
 icon: Stethoscope,
 description: 'Individual physician metrics and rankings'
  },
  {
 id: 'devices',
 label: 'Device Pathways',
 icon: BarChart3,
 description: 'CRT, ICD, and CardioMEMS funnels'
  },
  {
 id: 'advanced-devices',
 label: 'Advanced Devices',
 icon: Activity,
 description: 'Underutilized high-value interventions'
  },
  {
 id: 'phenotypes',
 label: 'Basic Phenotypes',
 icon: Search,
 description: 'Iron deficiency & sleep apnea assessment'
  },
  {
 id: 'advanced-phenotypes',
 label: 'Specialty Phenotypes',
 icon: Heart,
 description: 'Beyond GDMT: 12 rare HF conditions'
  },
  {
 id: 'safety',
 label: 'Safety Screening',
 icon: Shield,
 description: 'GDMT contraindication checker'
  },
  {
 id: 'network',
 label: 'Care Team Network',
 icon: Network,
 description: 'Provider relationship & patient flow analysis'
  },
  {
 id: 'hf-care-network',
 label: 'HF Care Coordination',
 icon: Heart,
 description: 'Heart failure care pathways & GDMT optimization network'
  },
  {
 id: 'quality',
 label: 'Quality Metrics',
 icon: Users,
 description: 'Core and supplemental quality indicators'
  },
  {
 id: 'reporting',
 label: 'Automated Reports',
 icon: FileText,
 description: 'Scheduled reporting & data exports'
  },
  {
 id: 'clinical-gap-detection',
 label: 'Gap Detection (25-Gap)',
 icon: Target,
 description: 'AI-driven HF gap detection: ATTR-CM, iron deficiency, finerenone, GLP-1/HFpEF, HCM myosin inhibitor, CardioMEMS, CASTLE-AF, ivabradine, vericiguat, H-ISDN/A-HeFT, cardiac rehab, undiagnosed HFpEF, DANISH ICD, OSA-HF, RPM, ARNi underdosing, loop-without-MRA, hyponatremia, NT-proBNP monitoring, cardiac MRI, palliative care, diuretic resistance, predischarge NT-proBNP, functional MR/COAPT (cross-module), ATTR-CM+AS co-detection (cross-module). All gap detection criteria, risk scores, and composite calculators are automatically computed from structured EHR data ingested via Redox — no manual data entry or chart review required.'
  },
  {
 id: 'pro-outcomes',
 label: 'PRO Outcomes',
 icon: Activity,
 description: 'KCCQ patient-reported outcomes tracking'
  },
  {
 id: 'advanced-pipeline',
 label: 'Advanced Therapy Pipeline',
 icon: Zap,
 description: 'CardioMEMS, RPM, Barostim, and advanced HF referral pipeline powered by live gap detection data'
  },
  {
 id: 'hf-phenotype-detection',
 label: 'Phenotype Detection',
 icon: Heart,
 description: 'Heart failure phenotype detection and classification chart'
  }
];

// Export data configurations
const heartFailureExportData: Record<string, ExportData> = {
  providers: {
 headers: [
 'Provider Name',
 'Specialty',
 'Patient Volume',
 'GDMT Compliance',
 'Readmission Rate',
 'Quality Score',
 'Performance Tier'
 ],
 rows: [
 ['Dr. Sarah Martinez', 'Heart Failure Specialist', '387', '94.2%', '8.1%', '96.4', 'Tier 1'],
 ['Dr. Michael Chen', 'Cardiologist', '342', '89.7%', '9.2%', '92.1', 'Tier 1'],
 ['Dr. Lisa Thompson', 'Heart Failure Specialist', '298', '91.3%', '7.8%', '94.7', 'Tier 1'],
 ['Dr. James Wilson', 'Cardiologist', '267', '87.4%', '10.1%', '89.2', 'Tier 2'],
 ['Dr. Amanda Rodriguez', 'Heart Failure Specialist', '234', '93.1%', '8.4%', '95.3', 'Tier 1'],
 ['Dr. David Kim', 'Cardiologist', '189', '85.2%', '11.3%', '86.7', 'Tier 2'],
 ['Dr. Jennifer Lopez', 'Heart Failure Specialist', '156', '88.9%', '9.7%', '90.4', 'Tier 2']
 ],
 filename: 'heart_failure_provider_performance',
 title: 'Heart Failure Provider Performance Report',
 metadata: {
 'Report Type': 'Provider Scorecard',
 'Service Line': 'Heart Failure',
 'Period': 'Q4 2024',
 'Total Providers': '7',
 'Total Patients': '1,873',
 'Avg GDMT Compliance': '89.9%'
 }
  },
  gdmt: {
 headers: [
 'GDMT Pillar',
 'Current Rate',
 'Target Rate',
 'Gap',
 'Eligible Patients',
 'Opportunity Value'
 ],
 rows: [
 ['ACE/ARB/ARNI', '94.2%', '95%', '-0.8%', '2,387', '$1.2M'],
 ['Beta Blockers', '91.7%', '95%', '-3.3%', '2,294', '$2.8M'],
 ['MRAs', '78.4%', '85%', '-6.6%', '1,756', '$4.3M'],
 ['SGLT2 Inhibitors', '64.1%', '75%', '-10.9%', '1,892', '$6.7M'],
 ['Diuretics', '89.3%', '90%', '-0.7%', '2,156', '$0.9M'],
 ['Statins', '87.6%', '90%', '-2.4%', '2,034', '$1.8M']
 ],
 filename: 'heart_failure_gdmt_analytics',
 title: 'Heart Failure GDMT Optimization Analysis',
 metadata: {
 'Report Type': 'GDMT Analytics',
 'Service Line': 'Heart Failure',
 'Total Opportunity': '$17.7M',
 'Biggest Gap': 'SGLT2 Inhibitors (-10.9%)',
 'Best Performance': 'ACE/ARB/ARNI (94.2%)'
 }
  }
};

// Heart Failure Service Line Configuration
export const heartFailureServiceLineConfig: ServiceLineViewConfig = {
  moduleName: 'Heart Failure',
  moduleDescription: 'Comprehensive provider performance and GDMT optimization dashboard',
  moduleIcon: Heart,
  primaryColor: 'medical-red',
  tabs: heartFailureTabs,
  tabContent: {
 'gdmt': GDMTAnalyticsDashboard,
 'heatmap': PatientRiskHeatmap,
 'providers': ProviderScorecard,
 'devices': DevicePathwayFunnel,
 'advanced-devices': AdvancedDeviceTracker,
 'phenotypes': HFPhenotypeClassification,
 'advanced-phenotypes': SpecialtyPhenotypesDashboard,
 'safety': GDMTContraindicationChecker,
 'network': CareTeamNetworkGraph,
 'hf-care-network': HFCareNetworkVisualization,
 'quality': QualityMetricsDashboard,
 'reporting': AutomatedReportingSystem,
 'clinical-gap-detection': ClinicalGapDetectionDashboard,
 'pro-outcomes': KCCQOutcomesPanel,
 'advanced-pipeline': HFAdvancedTherapyPipeline,
 'hf-phenotype-detection': PhenotypeDetectionChart
  },
  exportData: heartFailureExportData,
  hasExport: true
};