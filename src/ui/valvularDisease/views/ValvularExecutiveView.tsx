import React, { useState } from 'react';
import { useModuleDashboard } from '../../../hooks/useModuleDashboard';
import SharedDRGPerformance from '../../../components/shared/SharedDRGPerformance';
import { valvularDiseaseConfig } from '../config/executiveConfig';
import ExportButton from '../../../components/shared/ExportButton';
import { ExportData } from '../../../utils/dataExport';
import ZipHeatMap from '../../../components/shared/ZipHeatMap';
import SharedROIWaterfall from '../../../components/shared/SharedROIWaterfall';
import SharedBenchmarksPanel, { BenchmarkMetric } from '../../../components/shared/SharedBenchmarksPanel';
import SharedProjectedVsRealized from '../../../components/shared/SharedProjectedVsRealized';
import BaseDetailModal from '../../../components/shared/BaseDetailModal';
import DemoDataBadge from '../../../components/shared/DemoDataBadge';
import { getOrdinalSuffix, formatMillions, toFixed, roundTo } from '../../../utils/formatters';
import GapIntelligenceCard from '../../../components/shared/GapIntelligenceCard';
import VHDExecutiveSummary, { VHDDashboardData } from '../components/VHDExecutiveSummary';
import VHDForwardOutlookPanel from '../components/VHDForwardOutlookPanel';
import {
  VHD_DEMO_WATERFALL,
  VHD_DEMO_ROI_CATEGORIES,
  VHD_DEMO_ANNUAL_OPPORTUNITY_M,
  VHD_DEMO_PVR,
  VHD_DEMO_CATEGORIES,
  VHD_DEMO_TOPGAPS,
  VHD_DEMO_SAFETY_ALERT,
} from '../config/vhdDemoFinancials';

// ── Icons ──────────────────────────────────────────────────────────
const HeartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);
const DollarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const TrendUpIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

// ── Valvular Benchmark Metrics ─────────────────────────────────────
const valvularBenchmarks: BenchmarkMetric[] = [
  { metric: 'TAVR 30-Day Mortality', ourValue: 2.1, benchmark: 2.5, unit: '%', trend: 'down', percentile: 82, lowerIsBetter: true },
  { metric: 'Valve Grading Accuracy', ourValue: 91.4, benchmark: 88.0, unit: '%', trend: 'up', percentile: 78 },
  { metric: 'Echo-to-Intervention Time', ourValue: 14.2, benchmark: 18.0, unit: 'days', trend: 'down', percentile: 85, lowerIsBetter: true },
  { metric: 'Paravalvular Leak Rate', ourValue: 3.8, benchmark: 5.2, unit: '%', trend: 'down', percentile: 88, lowerIsBetter: true },
  { metric: 'Heart Team Utilization', ourValue: 78.6, benchmark: 85.0, unit: '%', trend: 'up', percentile: 62 },
  { metric: 'Post-Op Readmission Rate', ourValue: 8.4, benchmark: 9.1, unit: '%', trend: 'down', percentile: 74, lowerIsBetter: true },
];





// ── DRG Drill-Down Data ────────────────────────────────────────────
const drgDetailData = {
  'DRG 216': [
 { mrn: 'VD-10041', procedure: 'TAVR - Edwards SAPIEN 3', surgeon: 'Dr. Chen', los: 5, charges: 185000, reimbursement: 162000, margin: 12.4, status: 'Discharged' },
 { mrn: 'VD-10087', procedure: 'SAVR - Mechanical Valve', surgeon: 'Dr. Patel', los: 8, charges: 210000, reimbursement: 178000, margin: 15.2, status: 'Discharged' },
 { mrn: 'VD-10125', procedure: 'TAVR - Medtronic CoreValve', surgeon: 'Dr. Williams', los: 4, charges: 192000, reimbursement: 168000, margin: 12.5, status: 'In Recovery' },
 { mrn: 'VD-10163', procedure: 'SAVR - Bioprosthetic', surgeon: 'Dr. Chen', los: 7, charges: 198000, reimbursement: 172000, margin: 13.1, status: 'Discharged' },
 { mrn: 'VD-10201', procedure: 'TAVR - Edwards SAPIEN 3', surgeon: 'Dr. Rodriguez', los: 3, charges: 178000, reimbursement: 158000, margin: 11.2, status: 'Discharged' },
 { mrn: 'VD-10248', procedure: 'SAVR - Mechanical Valve', surgeon: 'Dr. Patel', los: 9, charges: 225000, reimbursement: 185000, margin: 17.8, status: 'Discharged' },
 { mrn: 'VD-10289', procedure: 'TAVR - Boston Scientific ACURATE', surgeon: 'Dr. Williams', los: 4, charges: 188000, reimbursement: 165000, margin: 12.2, status: 'Discharged' },
 { mrn: 'VD-10334', procedure: 'SAVR - Bioprosthetic', surgeon: 'Dr. Chen', los: 6, charges: 195000, reimbursement: 170000, margin: 12.8, status: 'In Recovery' },
  ],
  'DRG 217': [
 { mrn: 'VD-10402', procedure: 'MitraClip - Abbott', surgeon: 'Dr. Kim', los: 3, charges: 142000, reimbursement: 125000, margin: 12.0, status: 'Discharged' },
 { mrn: 'VD-10456', procedure: 'Balloon Valvuloplasty', surgeon: 'Dr. Rodriguez', los: 2, charges: 68000, reimbursement: 58000, margin: 14.7, status: 'Discharged' },
 { mrn: 'VD-10489', procedure: 'MitraClip - Abbott', surgeon: 'Dr. Kim', los: 4, charges: 148000, reimbursement: 128000, margin: 13.5, status: 'In Recovery' },
 { mrn: 'VD-10523', procedure: 'TEER - Edwards PASCAL', surgeon: 'Dr. Williams', los: 3, charges: 155000, reimbursement: 132000, margin: 14.8, status: 'Discharged' },
 { mrn: 'VD-10567', procedure: 'Balloon Valvuloplasty', surgeon: 'Dr. Rodriguez', los: 2, charges: 72000, reimbursement: 62000, margin: 13.9, status: 'Discharged' },
  ],
};

const drgColumns = [
  { key: 'mrn' as const, label: 'MRN', sortable: true },
  { key: 'procedure' as const, label: 'Procedure', sortable: true },
  { key: 'surgeon' as const, label: 'Surgeon', sortable: true },
  { key: 'los' as const, label: 'LOS', sortable: true, render: (v: any) => `${v} days` },
  { key: 'charges' as const, label: 'Charges', sortable: true, render: (v: any) => `$${toFixed(v / 1000, 0)}K` },
  { key: 'reimbursement' as const, label: 'Reimb.', sortable: true, render: (v: any) => `$${toFixed(v / 1000, 0)}K` },
  { key: 'margin' as const, label: 'Margin', sortable: true, render: (v: any) => `${toFixed(v, 1)}%` },
  { key: 'status' as const, label: 'Status', sortable: true },
];

// ── ZIP Code Data ──────────────────────────────────────────────────
const valvularZipData = [
  { zipCode: "10001", patientCount: 41, riskScore: 8.2, riskLevel: "High" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10002", patientCount: 35, riskScore: 7.1, riskLevel: "High" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10003", patientCount: 28, riskScore: 5.3, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10009", patientCount: 32, riskScore: 6.6, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10010", patientCount: 25, riskScore: 4.2, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10011", patientCount: 23, riskScore: 3.8, riskLevel: "Low" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10012", patientCount: 38, riskScore: 7.4, riskLevel: "High" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10013", patientCount: 29, riskScore: 5.7, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10014", patientCount: 34, riskScore: 6.1, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10016", patientCount: 27, riskScore: 4.5, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10017", patientCount: 24, riskScore: 4.0, riskLevel: "Low" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10018", patientCount: 31, riskScore: 5.6, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "75003", patientCount: 26, riskScore: 4.7, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10021", patientCount: 20, riskScore: 3.1, riskLevel: "Low" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10022", patientCount: 22, riskScore: 3.6, riskLevel: "Low" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10023", patientCount: 33, riskScore: 6.3, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10024", patientCount: 28, riskScore: 5.0, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "75002", patientCount: 30, riskScore: 5.9, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10026", patientCount: 40, riskScore: 7.7, riskLevel: "High" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10027", patientCount: 36, riskScore: 7.1, riskLevel: "High" as const, conditionType: "Stage C/D Valve Disease Gap" },
];

const ValvularExecutiveView: React.FC = () => {
  // useModuleDashboard returns `data: any`; the VHD dashboard endpoint emits the
  // VHDDashboardData contract (patient/gap/device counts), so type it here to drop `any`.
  const { data: dashboardRaw, loading: dashboardLoading, error: dashboardError } = useModuleDashboard('valvular-disease');
  const dashboard = (dashboardRaw as VHDDashboardData | null) ?? null;
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const config = valvularDiseaseConfig;

  const handleZipClick = (zipCode: string) => {
 setActiveModal(`zip-${zipCode}`);
  };

  const generateExportData = (): ExportData => ({
 filename: 'valvular-disease-executive-report',
 title: 'Valvular Disease Executive Dashboard',
 headers: ['Metric', 'Value', 'Target', 'Variance'],
 rows: [
 ['Total Revenue Opportunity (gap-closure, demo)', `$${VHD_DEMO_ANNUAL_OPPORTUNITY_M.toFixed(1)}M`, '-', '-'],
 ['Patient Population (live)', dashboard?.summary?.totalPatients?.toLocaleString() ?? 'pending', '-', '-'],
 ['Optimal Therapy Rate', config.kpiData.gdmtOptimization, '85%', '-14%'],
 ['Avg Revenue per Patient', config.kpiData.avgRoi, '$42,000', '-$3,500'],
 ['Current CMI', config.drgMetrics.currentCMI, '2.35', '-0.23'],
 ['Documentation Rate', config.drgMetrics.documentationRate, '95%', '-3.6%'],
 ['Average LOS', config.drgMetrics.avgLOS, '6.2 days', '+0.6 days'],
 ],
 metadata: {
 reportDate: new Date().toISOString(),
 module: 'Valvular Disease',
 dataSource: 'TAILRD Analytics Platform',
 lastUpdated: '2024-01-15T10:30:00Z',
 },
  });



  return (
 <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>

 <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
      {/* Tier header - Export folded in as a right-aligned utility (closes the VHD-side
          AUDIT-161 export-above-headline inversion; the first SECTION is now the KPI
          summary, matching the HF/EP/SH/CAD exemplar). */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold font-display text-titanium-800">Valvular Disease Executive Dashboard</h2>
        <ExportButton
          data={generateExportData()}
          variant="outline"
          size="sm"
          className="shadow-sm hover:shadow-md transition-all duration-300"
        />
      </div>

      {/* 1. KPI summary - live patients / open gaps / device candidates + 3 demo cards. */}
      <VHDExecutiveSummary dashboard={dashboard} loading={dashboardLoading} error={dashboardError} />

      {/* 2. Clinical Gap Intelligence - live headline (totalOpenGaps + real totalPatients),
          demo-badged composition (donut / top-gaps / safety are illustrative). */}
      <GapIntelligenceCard
        data={{
          totalGaps: dashboard?.summary?.totalOpenGaps ?? 0,
          categories: VHD_DEMO_CATEGORIES,
          topGaps: VHD_DEMO_TOPGAPS,
          safetyAlert: VHD_DEMO_SAFETY_ALERT,
        }}
        totalPatients={dashboard?.summary?.totalPatients ?? 0}
        compositionDemo
      />

      {/* 3. Revenue Opportunity Waterfall - the SINGLE re-scoped waterfall, fed from the
          one $5.3M vhdDemoFinancials model (total === category-sum by construction; the
          $51.7M / $38.2M / ~$55M program-revenue figures are removed - program revenue is
          not an exec-tier gap-opportunity figure). */}
      <div className="metal-card mb-6">
        <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-titanium-900 mb-1">Revenue Opportunity Waterfall</h3>
              <p className="text-sm text-titanium-500">Annual gap-closure opportunity by valvular intervention category</p>
            </div>
            <DemoDataBadge />
          </div>
        </div>
        <div className="p-6">
          <SharedROIWaterfall
            categories={VHD_DEMO_ROI_CATEGORIES}
            totalRevenue={VHD_DEMO_WATERFALL.total_revenue * 1000000}
            realizedRevenue={VHD_DEMO_WATERFALL.realized_revenue * 1000000}
            onCategoryClick={(label) => setActiveModal(`category-${label}`)}
          />
        </div>
      </div>

      {/* 4. DRG Performance cards + CMI - promoted from dead-last (after the ZIP map);
          the bespoke clickable cards stay (fed well-formed drgDetailData arrays), demo-badged. */}
      <div className="metal-card p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xl font-bold text-titanium-900">{config.drgTitle}</h3>
          <DemoDataBadge label="Demo data - DRG billing source pending" />
        </div>
        <p className="text-sm text-titanium-500 mb-6">{config.drgDescription}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {config.drgPerformanceCards.map((drg, i) => {
            // Index 0 (MCC, highest) -> Metallic Gold; Index 1 (CC, mid) -> Chrome Blue mid; Index 2 (lowest) -> Carmona Red
            const drgColors = [
              { value: '#C4982A', bg: '#FAF6E8', border: '#D4B85C' },
              { value: '#4A6880', bg: '#F0F5FA', border: '#C8D4DC' },
              { value: '#9B2438', bg: '#FDF2F3', border: '#F5C0C8' },
            ];
            const dc = drgColors[i] || drgColors[0];
            return (
              <button
                key={drg.title}
                onClick={() => setActiveModal(`drg-${drg.title}`)}
                className="text-left p-4 rounded-xl border transition-all duration-200 group"
                style={{ background: dc.bg, borderColor: dc.border }}
              >
                <div className="text-sm text-titanium-500 mb-1">{drg.title}</div>
                <div className="text-2xl font-bold mb-2" style={{ color: dc.value }}>{drg.value}</div>
                <div className="text-xs text-titanium-400 mb-1">{drg.caseCount}</div>
                <div className="text-xs font-medium" style={{ color: drg.isPositive ? '#2C4A60' : '#9B2438' }}>
                  {drg.variance}
                </div>
              </button>
            );
          })}
        </div>

        {/* DRG Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-titanium-200">
          <div>
            <div className="text-xs text-titanium-400 mb-1">Current CMI</div>
            <div className="text-lg font-bold" style={{ color: '#2C4A60' }}>{config.drgMetrics.currentCMI}</div>
          </div>
          <div>
            <div className="text-xs text-titanium-400 mb-1">Monthly Opportunity</div>
            <div className="text-lg font-bold" style={{ color: '#8B6914' }}>{config.drgMetrics.monthlyOpportunity}</div>
          </div>
          <div>
            <div className="text-xs text-titanium-400 mb-1">Documentation Rate</div>
            <div className="text-lg font-bold" style={{ color: '#2D6147' }}>{config.drgMetrics.documentationRate}</div>
          </div>
          <div>
            <div className="text-xs text-titanium-400 mb-1">Avg LOS</div>
            <div className="text-lg font-bold" style={{ color: '#1A6878' }}>{config.drgMetrics.avgLOS}</div>
          </div>
        </div>
      </div>

      {/* DRGOptimizationAlert (SharedDRGPerformance alertOnly) - stays adjacent to the DRG panel. */}
      <SharedDRGPerformance config={config} variant="alertOnly" />

      {/* 5. Projected vs Realized + Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="metal-card">
          <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-titanium-900 mb-1">Projected vs Realized Revenue</h3>
                <p className="text-sm text-titanium-500">Valve procedure revenue tracking and variance analysis</p>
              </div>
              <DemoDataBadge />
            </div>
          </div>
          <div className="p-6">
            <SharedProjectedVsRealized
              monthlyData={VHD_DEMO_PVR.months}
              onMonthClick={(m) => setActiveModal(`month-${m.month}`)}
              gapSublabel="Immediate at-risk slice (this quarter) - see Revenue at Risk"
              cleanSurface
            />
          </div>
        </div>
        <div className="metal-card">
          <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-titanium-900 mb-1">Valvular Disease Clinical Benchmarks</h3>
                <p className="text-sm text-titanium-500">National comparison metrics</p>
              </div>
              <DemoDataBadge label="Demo benchmarks - national comparison pending" />
            </div>
          </div>
          <div className="p-6">
            <SharedBenchmarksPanel
              benchmarks={valvularBenchmarks}
              subtitle="Performance metrics against national standards and peer institutions"
              dataSource="STS National Database & TVT Registry"
              lastUpdated="March 2026"
              onBenchmarkClick={(metric) => setActiveModal(`benchmark-${metric}`)}
            />
          </div>
        </div>
      </div>

      {/* 6. Forward Outlook - consolidated 12-month projection (replaces the former
          pipeline / at-risk / trajectory / predictive cluster). Its DemoDataBadge is internal. */}
      <VHDForwardOutlookPanel />

      {/* 7. Geographic Heat Map */}
      <ZipHeatMap
        title="Stage C/D Valve Disease Care Gap Distribution"
        data={valvularZipData}
        onZipClick={handleZipClick}
        centerLat={40.7589}
        centerLng={-73.9851}
        zoom={12}
      />

      {/* Modals */}
       {activeModal?.startsWith('drg-') && (
 <BaseDetailModal
 title={activeModal.replace('drg-', '')}
 subtitle="Case-level financial detail"
 demoBadge
 icon={<DollarIcon />}
 summaryMetrics={[
 { label: 'Total Cases', value: activeModal.includes('216') ? '156' : activeModal.includes('217') ? '247' : '89' },
 { label: 'Avg LOS', value: config.drgMetrics.avgLOS },
 { label: 'CMI', value: config.drgMetrics.currentCMI },
 { label: 'Doc Rate', value: config.drgMetrics.documentationRate },
 ]}
 tableTitle="Individual Case Details"
 tableData={activeModal.includes('216') ? drgDetailData['DRG 216'] : drgDetailData['DRG 217']}
 columns={drgColumns}
 onClose={() => setActiveModal(null)}
 />
 )}

 {activeModal?.startsWith('month-') && (
 <BaseDetailModal
 title={`${activeModal.replace('month-', '')} Revenue Detail`}
 subtitle="Monthly projected vs realized breakdown"
 demoBadge
 icon={<ChartIcon />}
 summaryMetrics={(() => {
 const m = VHD_DEMO_PVR.months.find(d => activeModal.includes(d.month));
 if (!m) return [];
 const gap = m.projected - m.realized;
 return [
 { label: 'Projected', value: `$${toFixed(m.projected / 1000000, 1)}M`, color: 'porsche' as const },
 { label: 'Realized', value: `$${toFixed(m.realized / 1000000, 1)}M`, color: 'green' as const },
 { label: 'Gap', value: `$${toFixed(gap / 1000000, 1)}M`, color: gap > 500000 ? 'red' as const : 'amber' as const },
 { label: 'Capture Rate', value: `${toFixed((m.realized / m.projected) * 100, 1)}%` },
 ];
 })()}
 onClose={() => setActiveModal(null)}
 />
 )}

 {activeModal?.startsWith('benchmark-') && (
 <BaseDetailModal
 title={activeModal.replace('benchmark-', '')}
 subtitle="Benchmark performance detail"
 demoBadge
 icon={<TrendUpIcon />}
 summaryMetrics={(() => {
 const b = valvularBenchmarks.find(m => activeModal.includes(m.metric));
 if (!b) return [];
 return [
 { label: 'Our Value', value: `${b.ourValue}${b.unit}`, color: 'porsche' as const },
 { label: 'Benchmark', value: `${b.benchmark}${b.unit}` },
 { label: 'Percentile', value: `${b.percentile}${getOrdinalSuffix(b.percentile)}`, color: b.percentile >= 75 ? 'green' as const : 'amber' as const },
 { label: 'Trend', value: b.trend === 'up' ? 'Improving' : b.trend === 'down' ? (b.lowerIsBetter ? 'Improving' : 'Declining') : 'Stable' },
 ];
 })()}
 onClose={() => setActiveModal(null)}
 />
 )}

 {activeModal?.startsWith('category-') && (() => {
 const label = activeModal.replace('category-', '');
 const cat = VHD_DEMO_ROI_CATEGORIES.find(c => c.label === label);
 const realizedRatio = VHD_DEMO_WATERFALL.realized_revenue / VHD_DEMO_WATERFALL.total_revenue;
 return (
 <BaseDetailModal
 title={label}
 subtitle="Revenue Opportunity Category Detail"
 demoBadge
 icon={<DollarIcon />}
 summaryMetrics={[
 { label: 'Annual Opportunity', value: cat ? `${toFixed(cat.value / 1000000, 1)}M` : 'N/A', colorScheme: 'porsche' },
 { label: 'Share of Total', value: cat ? `${toFixed((cat.value / (VHD_DEMO_ANNUAL_OPPORTUNITY_M * 1000000)) * 100, 1)}%` : 'N/A' },
 { label: 'Realized', value: `${toFixed((cat?.value || 0) * realizedRatio / 1000000, 1)}M`, colorScheme: 'green' },
 { label: 'Gap', value: `${toFixed((cat?.value || 0) * (1 - realizedRatio) / 1000000, 1)}M`, colorScheme: 'amber' },
 ]}
 onClose={() => setActiveModal(null)}
 />
 );
 })()}

 {activeModal?.startsWith('zip-') && (() => {
 const zipCode = activeModal.replace('zip-', '');
 const zipInfo = valvularZipData.find(z => z.zipCode === zipCode);
 return (
 <BaseDetailModal
 title={`ZIP Code ${zipCode}`}
 subtitle="Valve Disease Care Gap Patient Summary"
 demoBadge
 icon={<HeartIcon />}
 summaryMetrics={[
 { label: 'Patients', value: zipInfo?.patientCount?.toString() || '0', colorScheme: 'porsche' },
 { label: 'Risk Score', value: zipInfo?.riskScore ? toFixed(zipInfo.riskScore, 1) : 'N/A', colorScheme: zipInfo && zipInfo.riskScore >= 7 ? 'crimson' : 'amber' },
 { label: 'Risk Level', value: zipInfo?.riskLevel || 'N/A' },
 { label: 'Condition', value: 'Stage C/D Gap' },
 ]}
 onClose={() => setActiveModal(null)}
 />
 );
 })()}
 </div>
 </div>
  );
};

export default ValvularExecutiveView;
