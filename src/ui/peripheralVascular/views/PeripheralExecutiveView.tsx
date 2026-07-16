import React, { useState } from 'react';
import { useModuleDashboard } from '../../../hooks/useModuleDashboard';
import SharedDRGPerformance from '../../../components/shared/SharedDRGPerformance';
import { peripheralVascularConfig } from '../config/executiveConfig';
import ExportButton from '../../../components/shared/ExportButton';
import { ExportData } from '../../../utils/dataExport';
import ZipHeatMap from '../../../components/shared/ZipHeatMap';
import SharedROIWaterfall from '../../../components/shared/SharedROIWaterfall';
import SharedBenchmarksPanel, { BenchmarkMetric } from '../../../components/shared/SharedBenchmarksPanel';
import SharedProjectedVsRealized from '../../../components/shared/SharedProjectedVsRealized';
import BaseDetailModal from '../../../components/shared/BaseDetailModal';
import DemoDataBadge from '../../../components/shared/DemoDataBadge';
import { getOrdinalSuffix, toFixed } from '../../../utils/formatters';
import GapIntelligenceCard from '../../../components/shared/GapIntelligenceCard';
import PVExecutiveSummary, { PVDashboardData } from '../components/PVExecutiveSummary';
import PVForwardOutlookPanel from '../components/PVForwardOutlookPanel';
import {
  PV_DEMO_WATERFALL,
  PV_DEMO_ROI_CATEGORIES,
  PV_DEMO_ANNUAL_OPPORTUNITY_M,
  PV_DEMO_PVR,
  PV_DEMO_CATEGORIES,
  PV_DEMO_TOPGAPS,
  PV_DEMO_SAFETY_ALERT,
} from '../config/pvDemoFinancials';

// -- Icons -----------------------------------------------------------
const VascularIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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

// -- PAD Benchmark Metrics (clinical quality, not program revenue) ---
const padBenchmarks: BenchmarkMetric[] = [
  { metric: 'ABI Screening Rate', ourValue: 68.4, benchmark: 80.0, unit: '%', trend: 'up', percentile: 52 },
  { metric: 'Limb Salvage Rate', ourValue: 92.1, benchmark: 90.0, unit: '%', trend: 'up', percentile: 78 },
  { metric: 'WIfI Classification Use', ourValue: 74.2, benchmark: 85.0, unit: '%', trend: 'up', percentile: 58 },
  { metric: 'Endovascular Success Rate', ourValue: 94.6, benchmark: 92.0, unit: '%', trend: 'stable', percentile: 82 },
  { metric: '30-Day Amputation Rate', ourValue: 4.2, benchmark: 5.8, unit: '%', trend: 'down', percentile: 76, lowerIsBetter: true },
  { metric: 'Supervised Exercise Referral', ourValue: 42.8, benchmark: 60.0, unit: '%', trend: 'up', percentile: 38 },
];

// -- DRG Drill-Down Data (case-level billing detail; well-formed arrays, VHD-safe) ---
const drgDetailData = {
  'DRG 252': [
	{ mrn: 'PV-20041', procedure: 'PTA + Stent - SFA', surgeon: 'Dr. Martinez', los: 3, charges: 68000, reimbursement: 58000, margin: 14.7, status: 'Discharged' },
	{ mrn: 'PV-20087', procedure: 'Atherectomy - Popliteal', surgeon: 'Dr. Lee', los: 4, charges: 82000, reimbursement: 72000, margin: 12.2, status: 'Discharged' },
	{ mrn: 'PV-20125', procedure: 'Bypass Graft - Fem-Pop', surgeon: 'Dr. Jackson', los: 6, charges: 95000, reimbursement: 82000, margin: 13.7, status: 'In Recovery' },
	{ mrn: 'PV-20163', procedure: 'PTA + DCB - Tibial', surgeon: 'Dr. Martinez', los: 3, charges: 74000, reimbursement: 64000, margin: 13.5, status: 'Discharged' },
	{ mrn: 'PV-20201', procedure: 'Atherectomy + Stent - Iliac', surgeon: 'Dr. Lee', los: 2, charges: 72000, reimbursement: 62000, margin: 13.9, status: 'Discharged' },
	{ mrn: 'PV-20248', procedure: 'Bypass Graft - Fem-Tibial', surgeon: 'Dr. Jackson', los: 7, charges: 105000, reimbursement: 88000, margin: 16.2, status: 'Discharged' },
	{ mrn: 'PV-20289', procedure: 'PTA + Stent - SFA', surgeon: 'Dr. Martinez', los: 2, charges: 65000, reimbursement: 56000, margin: 13.8, status: 'Discharged' },
  ],
  'DRG 253': [
	{ mrn: 'PV-20402', procedure: 'ABI Assessment + Angiography', surgeon: 'Dr. Chen', los: 1, charges: 18000, reimbursement: 14500, margin: 19.4, status: 'Discharged' },
	{ mrn: 'PV-20456', procedure: 'Wound Debridement + VAC', surgeon: 'Dr. Lee', los: 5, charges: 42000, reimbursement: 35000, margin: 16.7, status: 'Discharged' },
	{ mrn: 'PV-20489', procedure: 'Duplex Ultrasound Surveillance', surgeon: 'Dr. Martinez', los: 1, charges: 12000, reimbursement: 9800, margin: 18.3, status: 'Discharged' },
	{ mrn: 'PV-20523', procedure: 'Wound Debridement + Graft', surgeon: 'Dr. Jackson', los: 4, charges: 52000, reimbursement: 44000, margin: 15.4, status: 'In Recovery' },
	{ mrn: 'PV-20567', procedure: 'Thrombolysis - Acute Limb', surgeon: 'Dr. Chen', los: 3, charges: 48000, reimbursement: 40000, margin: 16.7, status: 'Discharged' },
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

// -- ZIP Code Data ---------------------------------------------------
const padZipData = [
  { zipCode: "10001", patientCount: 52, riskScore: 8.5, riskLevel: "High" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10002", patientCount: 44, riskScore: 7.3, riskLevel: "High" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10003", patientCount: 38, riskScore: 5.8, riskLevel: "Medium" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10009", patientCount: 41, riskScore: 6.9, riskLevel: "Medium" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10010", patientCount: 33, riskScore: 4.6, riskLevel: "Medium" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10011", patientCount: 29, riskScore: 3.9, riskLevel: "Low" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10012", patientCount: 47, riskScore: 7.8, riskLevel: "High" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10013", patientCount: 36, riskScore: 5.5, riskLevel: "Medium" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10014", patientCount: 42, riskScore: 6.4, riskLevel: "Medium" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10016", patientCount: 35, riskScore: 5.1, riskLevel: "Medium" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10017", patientCount: 30, riskScore: 4.2, riskLevel: "Low" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10018", patientCount: 39, riskScore: 6.0, riskLevel: "Medium" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "75003", patientCount: 34, riskScore: 5.3, riskLevel: "Medium" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10021", patientCount: 27, riskScore: 3.5, riskLevel: "Low" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10022", patientCount: 28, riskScore: 3.7, riskLevel: "Low" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10023", patientCount: 43, riskScore: 6.7, riskLevel: "Medium" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10024", patientCount: 37, riskScore: 5.4, riskLevel: "Medium" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "75002", patientCount: 40, riskScore: 6.2, riskLevel: "Medium" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10026", patientCount: 50, riskScore: 8.1, riskLevel: "High" as const, conditionType: "PAD/CLTI Care Gap" },
  { zipCode: "10027", patientCount: 46, riskScore: 7.5, riskLevel: "High" as const, conditionType: "PAD/CLTI Care Gap" },
];

const PeripheralExecutiveView: React.FC = () => {
  // useModuleDashboard returns `data: any`; the PV dashboard endpoint emits the
  // PVDashboardData contract (patient/gap/device counts), so type it here to drop `any`.
  const { data: dashboardRaw, loading: dashboardLoading, error: dashboardError } = useModuleDashboard('peripheral-vascular');
  const dashboard = (dashboardRaw as PVDashboardData | null) ?? null;
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const config = peripheralVascularConfig;

  const handleZipClick = (zipCode: string) => {
	setActiveModal(`zip-${zipCode}`);
  };

  const generateExportData = (): ExportData => ({
	filename: 'peripheral-vascular-executive-report',
	title: 'Peripheral Vascular Executive Dashboard',
	headers: ['Metric', 'Value', 'Target', 'Variance'],
	rows: [
	['Total Revenue Opportunity (gap-closure, registry)', config.kpiData.totalOpportunity, '-', '-'],
	['Patient Population (live)', dashboard?.summary?.totalPatients?.toLocaleString() ?? 'pending', '-', '-'],
	['Optimal PAD Therapy Rate', config.kpiData.gdmtOptimization, '-', '-'],
	['Avg Revenue per Patient', config.kpiData.avgRoi, '-', '-'],
	['Current CMI', config.drgMetrics.currentCMI, '-', '-'],
	['Documentation Rate', config.drgMetrics.documentationRate, '-', '-'],
	['Average LOS', config.drgMetrics.avgLOS, '-', '-'],
	],
	metadata: {
	reportDate: new Date().toISOString(),
	module: 'Peripheral Vascular',
	dataSource: 'TAILRD Analytics Platform',
	lastUpdated: '2024-01-15T10:30:00Z',
	},
  });

  return (
	<div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>

	<div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
      {dashboardLoading && <div className="text-titanium-500 text-sm animate-pulse">Loading live data...</div>}

      {/* Tier header - Export folded in as a right-aligned utility (closes the PV-side
          AUDIT-161 export-above-headline inversion - the LAST of the 6; the first SECTION
          is now the KPI summary, matching the HF/EP/SH/CAD/VHD exemplar). */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold font-display text-titanium-800">Peripheral Vascular Executive Dashboard</h2>
        <ExportButton
          data={generateExportData()}
          variant="outline"
          size="sm"
          className="shadow-sm hover:shadow-md transition-all duration-300"
        />
      </div>

      {/* 1. KPI summary - live patients / open gaps / device candidates + registry
          revenue-opportunity + 2 demo cards. */}
      <PVExecutiveSummary dashboard={dashboard} loading={dashboardLoading} error={dashboardError} />

      {/* 2. Clinical Gap Intelligence - live headline (totalOpenGaps + real totalPatients),
          demo-badged composition (donut / top-gaps / safety are illustrative). */}
      <GapIntelligenceCard
        data={{
          totalGaps: dashboard?.summary?.totalOpenGaps ?? 0,
          categories: PV_DEMO_CATEGORIES,
          topGaps: PV_DEMO_TOPGAPS,
          safetyAlert: PV_DEMO_SAFETY_ALERT,
        }}
        totalPatients={dashboard?.summary?.totalPatients ?? 0}
        compositionDemo
      />

      {/* 3. Revenue Opportunity Waterfall - the SINGLE re-scoped waterfall, fed from the
          one $8.1M pvDemoFinancials model (total === category-sum by construction; the
          $42.3M / $29.8M / $40.8M-categories / ~$44M program-revenue figures are removed -
          program revenue is not an exec-tier gap-opportunity figure). */}
      <div className="metal-card mb-6">
        <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-titanium-900 mb-1">Revenue Opportunity Waterfall</h3>
              <p className="text-sm text-titanium-500">Annual gap-closure opportunity by peripheral vascular intervention category</p>
            </div>
            <DemoDataBadge />
          </div>
        </div>
        <div className="p-6">
          <SharedROIWaterfall
            categories={PV_DEMO_ROI_CATEGORIES}
            totalRevenue={PV_DEMO_WATERFALL.total_revenue * 1000000}
            realizedRevenue={PV_DEMO_WATERFALL.realized_revenue * 1000000}
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
                <p className="text-sm text-titanium-500">Peripheral vascular procedure revenue tracking and variance analysis</p>
              </div>
              <DemoDataBadge />
            </div>
          </div>
          <div className="p-6">
            <SharedProjectedVsRealized
              monthlyData={PV_DEMO_PVR.months}
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
                <h3 className="text-lg font-semibold text-titanium-900 mb-1">Peripheral Vascular Clinical Benchmarks</h3>
                <p className="text-sm text-titanium-500">National comparison metrics</p>
              </div>
              <DemoDataBadge label="Demo benchmarks - national comparison pending" />
            </div>
          </div>
          <div className="p-6">
            <SharedBenchmarksPanel
              benchmarks={padBenchmarks}
              subtitle="Performance metrics against national standards and peer institutions"
              dataSource="SVS Vascular Quality Initiative (VQI)"
              lastUpdated="March 2026"
              onBenchmarkClick={(metric) => setActiveModal(`benchmark-${metric}`)}
            />
          </div>
        </div>
      </div>

      {/* 6. Forward Outlook - consolidated 12-month projection (replaces the former
          pipeline / at-risk / predictive cluster). Its DemoDataBadge is internal. */}
      <PVForwardOutlookPanel />

      {/* 7. Geographic Heat Map */}
      <ZipHeatMap
        title="PAD / CLTI Care Gap Geographic Distribution"
        data={padZipData}
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
	{ label: 'Total Cases', value: activeModal.includes('251') ? '184' : activeModal.includes('252') ? '423' : '298' },
	{ label: 'Avg LOS', value: config.drgMetrics.avgLOS },
	{ label: 'CMI', value: config.drgMetrics.currentCMI },
	{ label: 'Doc Rate', value: config.drgMetrics.documentationRate },
	]}
	tableTitle="Individual Case Details"
	tableData={activeModal.includes('252') ? drgDetailData['DRG 252'] : drgDetailData['DRG 253']}
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
	const m = PV_DEMO_PVR.months.find(d => activeModal.includes(d.month));
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
	const b = padBenchmarks.find(m => activeModal.includes(m.metric));
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
	const cat = PV_DEMO_ROI_CATEGORIES.find(c => c.label === label);
	const realizedRatio = PV_DEMO_WATERFALL.realized_revenue / PV_DEMO_WATERFALL.total_revenue;
	return (
	<BaseDetailModal
	title={label}
	subtitle="Revenue Opportunity Category Detail"
	demoBadge
	icon={<DollarIcon />}
	summaryMetrics={[
	{ label: 'Annual Opportunity', value: cat ? `${toFixed(cat.value / 1000000, 1)}M` : 'N/A', colorScheme: 'porsche' },
	{ label: 'Share of Total', value: cat ? `${toFixed((cat.value / (PV_DEMO_ANNUAL_OPPORTUNITY_M * 1000000)) * 100, 1)}%` : 'N/A' },
	{ label: 'Realized', value: `${toFixed((cat?.value || 0) * realizedRatio / 1000000, 1)}M`, colorScheme: 'green' },
	{ label: 'Gap', value: `${toFixed((cat?.value || 0) * (1 - realizedRatio) / 1000000, 1)}M`, colorScheme: 'amber' },
	]}
	onClose={() => setActiveModal(null)}
	/>
	);
	})()}

	{activeModal?.startsWith('zip-') && (() => {
	const zipCode = activeModal.replace('zip-', '');
	const zipInfo = padZipData.find(z => z.zipCode === zipCode);
	return (
	<BaseDetailModal
	title={`ZIP Code ${zipCode}`}
	subtitle="PAD / CLTI Care Gap Patient Summary"
	demoBadge
	icon={<VascularIcon />}
	summaryMetrics={[
	{ label: 'Patients', value: zipInfo?.patientCount?.toString() || '0', colorScheme: 'porsche' },
	{ label: 'Risk Score', value: zipInfo?.riskScore ? toFixed(zipInfo.riskScore, 1) : 'N/A', colorScheme: zipInfo && zipInfo.riskScore >= 7 ? 'crimson' : 'amber' },
	{ label: 'Risk Level', value: zipInfo?.riskLevel || 'N/A' },
	{ label: 'Condition', value: 'PAD/CLTI Gap' },
	]}
	onClose={() => setActiveModal(null)}
	/>
	);
	})()}
	</div>
	</div>
  );
};

export default PeripheralExecutiveView;
