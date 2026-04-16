import React, { useState } from 'react';
import { useModuleDashboard } from '../../../hooks/useModuleDashboard';
import BaseExecutiveView from '../../../components/shared/BaseExecutiveView';
import { peripheralVascularConfig } from '../config/executiveConfig';
import ExportButton from '../../../components/shared/ExportButton';
import { ExportData } from '../../../utils/dataExport';
import ZipHeatMap from '../../../components/shared/ZipHeatMap';
import SharedROIWaterfall, { WaterfallCategory } from '../../../components/shared/SharedROIWaterfall';
import SharedBenchmarksPanel, { BenchmarkMetric } from '../../../components/shared/SharedBenchmarksPanel';
import SharedProjectedVsRealized, { MonthData } from '../../../components/shared/SharedProjectedVsRealized';
import BaseDetailModal from '../../../components/shared/BaseDetailModal';
import { getOrdinalSuffix, formatMillions, toFixed, roundTo } from '../../../utils/formatters';
import { Zap, Search } from 'lucide-react';
import GapIntelligenceCard from '../../../components/shared/GapIntelligenceCard';
import GapResponseRateCard from '../../../components/shared/GapResponseRateCard';
import PredictiveMetricsBanner from '../../../components/shared/PredictiveMetricsBanner';
import { RevenuePipelineCard, RevenueAtRiskCard, TrajectoryTrendsCard } from '../../../components/shared/ForwardLookingCards';
import type { RevenuePipelineData, RevenueAtRiskData, TrajectoryTrendsData } from '../../../components/shared/ForwardLookingCards';

// ── Icons ──────────────────────────────────────────────────────────
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

// ── PAD Benchmark Metrics ──────────────────────────────────────────
const padBenchmarks: BenchmarkMetric[] = [
  { metric: 'ABI Screening Rate', ourValue: 68.4, benchmark: 80.0, unit: '%', trend: 'up', percentile: 52 },
  { metric: 'Limb Salvage Rate', ourValue: 92.1, benchmark: 90.0, unit: '%', trend: 'up', percentile: 78 },
  { metric: 'WIfI Classification Use', ourValue: 74.2, benchmark: 85.0, unit: '%', trend: 'up', percentile: 58 },
  { metric: 'Endovascular Success Rate', ourValue: 94.6, benchmark: 92.0, unit: '%', trend: 'stable', percentile: 82 },
  { metric: '30-Day Amputation Rate', ourValue: 4.2, benchmark: 5.8, unit: '%', trend: 'down', percentile: 76, lowerIsBetter: true },
  { metric: 'Supervised Exercise Referral', ourValue: 42.8, benchmark: 60.0, unit: '%', trend: 'up', percentile: 38 },
];

// ── Revenue Waterfall Categories ───────────────────────────────────
const padWaterfallCategories: WaterfallCategory[] = [
  { label: 'Limb Salvage Optimization', value: 12400000, color: '#3E6275' },
  { label: 'Endovascular Intervention', value: 9200000, color: '#2C4A60' },
  { label: 'PAD Screening Program', value: 8600000, color: '#1E3347' },
  { label: 'Wound Care Coordination', value: 6800000, color: '#4A6880' },
  { label: 'WIfI Classification', value: 3800000, color: '#7A1A2E' },
];

// ── Monthly Projected vs Realized ──────────────────────────────────
const padMonthlyData: MonthData[] = [
  { month: 'Jul', projected: 3400000, realized: 2850000 },
  { month: 'Aug', projected: 3550000, realized: 2980000 },
  { month: 'Sep', projected: 3350000, realized: 3120000 },
  { month: 'Oct', projected: 3600000, realized: 3050000 },
  { month: 'Nov', projected: 3500000, realized: 3280000 },
  { month: 'Dec', projected: 3700000, realized: 2900000 },
  { month: 'Jan', projected: 3800000, realized: 3350000 },
  { month: 'Feb', projected: 3600000, realized: 3420000 },
  { month: 'Mar', projected: 3750000, realized: 3500000 },
  { month: 'Apr', projected: 3650000, realized: 3180000 },
  { month: 'May', projected: 3900000, realized: 3600000 },
  { month: 'Jun', projected: 4100000, realized: 3750000 },
];

// ── DRG Drill-Down Data ────────────────────────────────────────────
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

// ── ZIP Code Data ──────────────────────────────────────────────────
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
  const { data: dashboard, loading: dashboardLoading, error: dashboardError } = useModuleDashboard('peripheral-vascular');
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
	['Total Revenue Opportunity', config.kpiData.totalOpportunity, '$50M', '-$7.7M'],
	['Patient Population', config.kpiData.totalPatients, '2,000', '-153'],
	['Optimal PAD Therapy Rate', config.kpiData.gdmtOptimization, '75%', '-13%'],
	['Avg Revenue per Patient', config.kpiData.avgRoi, '$28,000', '-$5,100'],
	['Current CMI', config.drgMetrics.currentCMI, '2.10', '-0.36'],
	['Documentation Rate', config.drgMetrics.documentationRate, '92%', '-7.4%'],
	['Average LOS', config.drgMetrics.avgLOS, '3.2 days', '+0.6 days'],
	],
	metadata: {
	reportDate: new Date().toISOString(),
	module: 'Peripheral Vascular',
	dataSource: 'TAILRD Analytics Platform',
	lastUpdated: '2024-01-15T10:30:00Z',
	},
  });

  // Colors: Chrome Blue (patients), Metallic Gold (revenue), Racing Green (quality), Copper Bronze (avg revenue)
  const kpiCards = [
	{ label: 'Total Patients', value: dashboard?.data?.summary?.totalPatients?.toLocaleString() ?? config.kpiData.totalPatients, sub: config.kpiData.totalPatientsSub, icon: <VascularIcon />, valueColor: '#2C4A60', bg: '#EFF4F8', border: '#B8C9D9' },
	{ label: 'Revenue Opportunity', value: config.kpiData.totalOpportunity, sub: config.kpiData.totalOpportunitySub, icon: <DollarIcon />, valueColor: '#8B6914', bg: '#FAF6E8', border: '#D4B85C' },
	{ label: 'Optimal PAD Therapy', value: config.kpiData.gdmtOptimization, sub: config.kpiData.gdmtOptimizationSub, icon: <ChartIcon />, valueColor: '#2D6147', bg: '#EEF6F2', border: '#A8D0BC' },
	{ label: 'Avg Revenue / Patient', value: config.kpiData.avgRoi, sub: config.kpiData.avgRoiSub, icon: <TrendUpIcon />, valueColor: '#8B5A2B', bg: '#FAF3EC', border: '#DDBA98' },
  ];

  return (
	<div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>

	<div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
	{dashboardError && <div className="bg-crimson-50 border border-crimson-200 text-crimson-800 px-4 py-3 rounded-lg">Dashboard: {dashboardError}</div>}
	{dashboardLoading && <div className="text-titanium-500 text-sm animate-pulse">Loading live data...</div>}
	<div className="flex justify-end mb-6">
	<ExportButton
	data={generateExportData()}
	variant="outline"
	size="md"
	className="shadow-lg hover:shadow-xl transition-all duration-300"
	/>
	</div>

	{/* Clinical Gap Intelligence */}
	<GapIntelligenceCard data={{
	  totalGaps: dashboard?.data?.summary?.totalOpenGaps ?? 12,
	  categories: [
	    { name: 'Therapy', patients: 320, color: '#2C4A60' },
	    { name: 'Safety', patients: 110, color: '#9B2438' },
	    { name: 'Growth', patients: 180, color: '#4A6880' },
	    { name: 'Quality', patients: 540, color: '#C8D4DC' },
	  ],
	  topGaps: [
	    { name: 'ABI Screening', patients: 280, opportunity: '$2.4M' },
	    { name: 'AAA Screening', patients: 195, opportunity: '$2.1M' },
	    { name: 'TCAR/Carotid', patients: 85, opportunity: '$1.8M' },
	    { name: 'VTE Extended AC', patients: 120, opportunity: '$1.2M' },
	    { name: 'IVC Filter Retrieval', patients: 65, opportunity: '$890K' },
	  ],
	  safetyAlert: 'CRITICAL: 48 patients \u00b7 HIGH: 62 patients',
	}} />

	{/* Gap Response Rate — care team action tracking */}
	<GapResponseRateCard
	  rates={[]}
	  overallRate={0}
	  timeRange="30d"
	/>

	{/* Forward-Looking Executive Cards */}
	<RevenuePipelineCard data={{
	  quarters: [
	    { quarter: 'Q1 2026', revenue: 1800000, procedures: 22, confidence: 'high' },
	    { quarter: 'Q2 2026', revenue: 1300000, procedures: 16, confidence: 'moderate' },
	    { quarter: 'Q3 2026', revenue: 1000000, procedures: 12, confidence: 'moderate' },
	    { quarter: 'Q4 2026', revenue: 700000, procedures: 9, confidence: 'low' },
	  ],
	  totalProjected12Month: 4800000,
	}} />
	<RevenueAtRiskCard data={{
	  immediatePatients: 48,
	  immediateRevenue: 2400000,
	  deferralRevenue: 1200000,
	  cumulativeRisk12Month: 4200000,
	  deferralCostPerMonth: 400000,
	}} />
	<TrajectoryTrendsCard data={{
	  worseningRapidPct: 16,
	  worseningRapidCount: 110,
	  meanDeclineRate: 'ABI decline 0.08/year',
	  declineMetric: 'PV',
	  thresholdIn30Days: 3,
	  totalFlaggedPatients: 690,
	  keyInsights: [
	    '48 critical limb ischemia patients with ABI declining below 0.4 -- intervention window narrowing',
	    'VTE recurrence risk: 23 patients with HERDOO2 >= 2 on anticoagulation reassessment timeline',
	    'AAA screening gap: 12 patients with aortic diameter approaching 5.5cm threshold',
	  ],
	}} />

	{/* Predictive Metrics Banner */}
	<PredictiveMetricsBanner data={{
	  thresholdIn90Days: 22,
	  quarterlyActionableRevenue: 2400000,
	  totalIdentifiedRevenue: 8200000,
	  rapidDeteriorationCount: 48,
	  avgTimeToEvent: 9,
	  projectedRevenueCurrentRate: 2800000,
	  projectedRevenueSystematic: 6400000,
	}} />

	{/* ── KPI Summary Cards ─────────────────────────────────── */}
	<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
	{kpiCards.map((kpi) => (
	<div key={kpi.label} className="metal-card p-5 group hover:shadow-metal-3 transition-all duration-300" style={{ background: kpi.bg, borderColor: kpi.border }}>
	<div className="flex items-center justify-between mb-3">
	<span className="text-titanium-500 text-sm font-medium">{kpi.label}</span>
	<span className="opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: kpi.valueColor }}>{kpi.icon}</span>
	</div>
	<div className="text-3xl font-bold mb-1" style={{ color: kpi.valueColor }}>{kpi.value}</div>
	<div className="text-xs text-titanium-400">{kpi.sub}</div>
	</div>
	))}
	</div>

	{/* ── Financial Analytics Row ──────────────────────────── */}
	<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
	<SharedROIWaterfall
	categories={padWaterfallCategories}
	totalRevenue={42300000}
	realizedRevenue={29800000}
	onCategoryClick={(label) => setActiveModal(`category-${label}`)}
	/>
	<SharedProjectedVsRealized
	title="Monthly Revenue: Projected vs Realized"
	subtitle="Peripheral vascular procedure revenue tracking over 12 months"
	monthlyData={padMonthlyData}
	onMonthClick={(m) => setActiveModal(`month-${m.month}`)}
	/>
	</div>

	{/* ── Benchmarks Panel ─────────────────────────────────── */}
	<SharedBenchmarksPanel
	title="Peripheral Vascular Clinical Benchmarks"
	subtitle="Performance metrics against national standards and peer institutions"
	benchmarks={padBenchmarks}
	dataSource="SVS Vascular Quality Initiative (VQI)"
	lastUpdated="March 2026"
	onBenchmarkClick={(metric) => setActiveModal(`benchmark-${metric}`)}
	/>

	{/* ── Geographic Heat Map ───────────────────────────────── */}
	<ZipHeatMap
	title="PAD / CLTI Care Gap Geographic Distribution"
	data={padZipData}
	onZipClick={handleZipClick}
	centerLat={40.7589}
	centerLng={-73.9851}
	zoom={12}
	/>

	{/* ── DRG Performance Cards ───────────────────────────── */}
	<div className="metal-card p-6">
	<h3 className="text-xl font-bold text-titanium-900 mb-1">{config.drgTitle}</h3>
	<p className="text-sm text-titanium-500 mb-6">{config.drgDescription}</p>

	<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
	{config.drgPerformanceCards.map((drg, i) => {
	// Index 0 (MCC, highest) → Metallic Gold; Index 1 (CC, mid) → Chrome Blue mid; Index 2 (lowest) → Carmona Red
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
	{/* Chrome Blue */}
	<div className="text-lg font-bold" style={{ color: '#2C4A60' }}>{config.drgMetrics.currentCMI}</div>
	</div>
	<div>
	<div className="text-xs text-titanium-400 mb-1">Monthly Opportunity</div>
	{/* Metallic Gold */}
	<div className="text-lg font-bold" style={{ color: '#8B6914' }}>{config.drgMetrics.monthlyOpportunity}</div>
	</div>
	<div>
	<div className="text-xs text-titanium-400 mb-1">Documentation Rate</div>
	{/* Racing Green */}
	<div className="text-lg font-bold" style={{ color: '#2D6147' }}>{config.drgMetrics.documentationRate}</div>
	</div>
	<div>
	<div className="text-xs text-titanium-400 mb-1">Avg LOS</div>
	{/* Steel Teal */}
	<div className="text-lg font-bold" style={{ color: '#1A6878' }}>{config.drgMetrics.avgLOS}</div>
	</div>
	</div>
	</div>

	{/* ── Base Executive View ──────────────────────────────── */}
	<BaseExecutiveView config={config} />

	{/* ── Modals ──────────────────────────────────────────── */}
	{activeModal?.startsWith('drg-') && (
	<BaseDetailModal
	title={activeModal.replace('drg-', '')}
	subtitle="Case-level financial detail"
	icon={<DollarIcon />}
	summaryMetrics={[
	{ label: 'Total Cases', value: activeModal.includes('252') ? '347' : activeModal.includes('113') ? '89' : '456' },
	{ label: 'Avg LOS', value: config.drgMetrics.avgLOS },
	{ label: 'CMI', value: config.drgMetrics.currentCMI },
	{ label: 'Doc Rate', value: config.drgMetrics.documentationRate },
	]}
	tableTitle="Individual Case Details"
	tableData={activeModal.includes('252') ? drgDetailData['DRG 252'] : drgDetailData['DRG 253']}
	columns={drgColumns}
	onClose={() => setActiveModal(null)}
	onExport={() => {}}
	/>
	)}

	{activeModal?.startsWith('month-') && (
	<BaseDetailModal
	title={`${activeModal.replace('month-', '')} Revenue Detail`}
	subtitle="Monthly projected vs realized breakdown"
	icon={<ChartIcon />}
	summaryMetrics={(() => {
	const m = padMonthlyData.find(d => activeModal.includes(d.month));
	if (!m) return [];
	const gap = m.projected - m.realized;
	return [
	{ label: 'Projected', value: formatMillions(m.projected), color: 'porsche' as const },
	{ label: 'Realized', value: formatMillions(m.realized), color: 'green' as const },
	{ label: 'Gap', value: formatMillions(gap), color: gap > 500000 ? 'red' as const : 'amber' as const },
	{ label: 'Capture Rate', value: `${toFixed(m.realized / m.projected * 100)}%` },
	];
	})()}
	onClose={() => setActiveModal(null)}
	/>
	)}

	{activeModal?.startsWith('benchmark-') && (
	<BaseDetailModal
	title={activeModal.replace('benchmark-', '')}
	subtitle="Benchmark performance detail"
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
	const cat = padWaterfallCategories.find(c => c.label === label);
	return (
	<BaseDetailModal
	title={label}
	subtitle="Revenue Opportunity Category Detail"
	icon={<DollarIcon />}
	summaryMetrics={[
	{ label: 'Annual Opportunity', value: cat ? formatMillions(cat.value) : '\u2014', colorScheme: 'porsche' },
	{ label: 'Share of Total', value: cat ? `${toFixed(cat.value / 42300000 * 100)}%` : '\u2014' },
	{ label: 'Realized', value: formatMillions((cat?.value || 0) * 0.70), colorScheme: 'green' },
	{ label: 'Gap', value: formatMillions((cat?.value || 0) * 0.30), colorScheme: 'amber' },
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
	icon={<VascularIcon />}
	summaryMetrics={[
	{ label: 'Patients', value: zipInfo?.patientCount?.toString() || '0', colorScheme: 'porsche' },
	{ label: 'Risk Score', value: zipInfo?.riskScore != null ? toFixed(zipInfo.riskScore, 1) : '—', colorScheme: zipInfo && zipInfo.riskScore >= 7 ? 'crimson' : 'amber' },
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
