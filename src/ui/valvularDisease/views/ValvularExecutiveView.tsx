import React, { useState } from 'react';
import BaseExecutiveView from '../../../components/shared/BaseExecutiveView';
import { valvularDiseaseConfig } from '../config/executiveConfig';
import ExportButton from '../../../components/shared/ExportButton';
import { ExportData } from '../../../utils/dataExport';
import ZipHeatMap from '../../../components/shared/ZipHeatMap';
import SharedROIWaterfall, { WaterfallCategory } from '../../../components/shared/SharedROIWaterfall';
import SharedBenchmarksPanel, { BenchmarkMetric } from '../../../components/shared/SharedBenchmarksPanel';
import SharedProjectedVsRealized, { MonthData } from '../../../components/shared/SharedProjectedVsRealized';
import BaseDetailModal from '../../../components/shared/BaseDetailModal';

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

// ── Revenue Waterfall Categories ───────────────────────────────────
const valvularWaterfallCategories: WaterfallCategory[] = [
  { label: 'Surgical vs Interventional', value: 18400000, color: '#7c3aed' },
  { label: 'Valve Severity Assessment', value: 12600000, color: '#095bb5' },
  { label: 'Echo Integration', value: 8200000, color: '#0c6fdb' },
  { label: 'Guideline Implementation', value: 6800000, color: '#0d9488' },
  { label: 'Follow-up Protocol', value: 4200000, color: '#16a34a' },
];

// ── Monthly Projected vs Realized ──────────────────────────────────
const valvularMonthlyData: MonthData[] = [
  { month: 'Jul', projected: 4200000, realized: 3650000 },
  { month: 'Aug', projected: 4350000, realized: 3780000 },
  { month: 'Sep', projected: 4100000, realized: 3920000 },
  { month: 'Oct', projected: 4500000, realized: 3850000 },
  { month: 'Nov', projected: 4300000, realized: 4100000 },
  { month: 'Dec', projected: 4600000, realized: 3700000 },
  { month: 'Jan', projected: 4800000, realized: 4250000 },
  { month: 'Feb', projected: 4400000, realized: 4180000 },
  { month: 'Mar', projected: 4700000, realized: 4350000 },
  { month: 'Apr', projected: 4550000, realized: 4020000 },
  { month: 'May', projected: 4900000, realized: 4500000 },
  { month: 'Jun', projected: 5100000, realized: 4680000 },
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
  { key: 'charges' as const, label: 'Charges', sortable: true, render: (v: any) => `$${(v / 1000).toFixed(0)}K` },
  { key: 'reimbursement' as const, label: 'Reimb.', sortable: true, render: (v: any) => `$${(v / 1000).toFixed(0)}K` },
  { key: 'margin' as const, label: 'Margin', sortable: true, render: (v: any) => `${v.toFixed(1)}%` },
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
  { zipCode: "10019", patientCount: 26, riskScore: 4.7, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10021", patientCount: 20, riskScore: 3.1, riskLevel: "Low" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10022", patientCount: 22, riskScore: 3.6, riskLevel: "Low" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10023", patientCount: 33, riskScore: 6.3, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10024", patientCount: 28, riskScore: 5.0, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10025", patientCount: 30, riskScore: 5.9, riskLevel: "Medium" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10026", patientCount: 40, riskScore: 7.7, riskLevel: "High" as const, conditionType: "Stage C/D Valve Disease Gap" },
  { zipCode: "10027", patientCount: 36, riskScore: 7.1, riskLevel: "High" as const, conditionType: "Stage C/D Valve Disease Gap" },
];

const ValvularExecutiveView: React.FC = () => {
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
 ['Total Revenue Opportunity', config.kpiData.totalOpportunity, '$58M', '-$6.3M'],
 ['Patient Population', config.kpiData.totalPatients, '1,500', '-158'],
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

  // ── KPI Cards Data ─────────────────────────────────────────────
  const kpiCards = [
 { label: 'Total Patients', value: config.kpiData.totalPatients, sub: config.kpiData.totalPatientsSub, icon: <HeartIcon />, color: 'text-violet-600' },
 { label: 'Revenue Opportunity', value: config.kpiData.totalOpportunity, sub: config.kpiData.totalOpportunitySub, icon: <DollarIcon />, color: 'text-porsche-600' },
 { label: 'Optimal Therapy Rate', value: config.kpiData.gdmtOptimization, sub: config.kpiData.gdmtOptimizationSub, icon: <ChartIcon />, color: 'text-teal-600' },
 { label: 'Avg Revenue / Patient', value: config.kpiData.avgRoi, sub: config.kpiData.avgRoiSub, icon: <TrendUpIcon />, color: 'text-green-600' },
  ];

  return (
 <div className="min-h-screen bg-gradient-to-br from-porsche-50 via-titanium-50 to-violet-50 p-6 relative overflow-hidden">
 {/* Web 3.0 Background */}
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-porsche-100 via-transparent to-transparent" />
 <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-400 to-porsche-400 rounded-full blur-3xl" />
 <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-porsche-400 to-teal-400 rounded-full blur-3xl" />

 <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
 {/* Header */}
 <header className="mb-8 flex justify-between items-start" role="banner">
 <div>
 <h1 className="text-5xl font-bold text-liquid-metal mb-2 font-sf drop-shadow-sm">
 Executive Dashboard
 </h1>
 <p className="text-lg text-titanium-600 font-medium">
 Financial performance and population health insights for Valvular Disease &bull; SAVR &bull; TAVR &bull; Mitral Interventions
 </p>
 </div>
 <ExportButton
 data={generateExportData()}
 variant="outline"
 size="md"
 className="shadow-lg hover:shadow-xl transition-all duration-300"
 />
 </header>

 {/* ── KPI Summary Cards ─────────────────────────────────── */}
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
 {kpiCards.map((kpi, i) => (
 <div key={i} className="metal-card p-5 group hover:shadow-metal-3 transition-all duration-300">
 <div className="flex items-center justify-between mb-3">
 <span className="text-titanium-500 text-sm font-medium">{kpi.label}</span>
 <span className={`${kpi.color} opacity-60 group-hover:opacity-100 transition-opacity`}>{kpi.icon}</span>
 </div>
 <div className="text-3xl font-bold text-titanium-900 mb-1">{kpi.value}</div>
 <div className="text-xs text-titanium-400">{kpi.sub}</div>
 </div>
 ))}
 </div>

 {/* ── Financial Analytics Row ──────────────────────────── */}
 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
 <SharedROIWaterfall
 categories={valvularWaterfallCategories}
 totalRevenue={51700000}
 realizedRevenue={38200000}
 onCategoryClick={(label) => setActiveModal(`category-${label}`)}
 />
 <SharedProjectedVsRealized
 title="Monthly Revenue: Projected vs Realized"
 subtitle="Valve procedure revenue tracking over 12 months"
 monthlyData={valvularMonthlyData}
 onMonthClick={(m) => setActiveModal(`month-${m.month}`)}
 />
 </div>

 {/* ── Benchmarks Panel ─────────────────────────────────── */}
 <SharedBenchmarksPanel
 title="Valvular Disease Clinical Benchmarks"
 subtitle="Performance metrics against national standards and peer institutions"
 benchmarks={valvularBenchmarks}
 dataSource="STS National Database & TVT Registry"
 lastUpdated="March 2026"
 onBenchmarkClick={(metric) => setActiveModal(`benchmark-${metric}`)}
 />

 {/* ── Geographic Heat Map ───────────────────────────────── */}
 <ZipHeatMap
 title="Stage C/D Valve Disease Care Gap Distribution"
 data={valvularZipData}
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
 {config.drgPerformanceCards.map((drg, i) => (
 <button
 key={i}
 onClick={() => setActiveModal(`drg-${drg.title}`)}
 className="text-left p-4 rounded-xl border border-titanium-200 bg-white hover:bg-porsche-50/30 hover:border-porsche-300/40 transition-all duration-200 group"
 >
 <div className="text-sm text-titanium-500 mb-1">{drg.title}</div>
 <div className="text-2xl font-bold text-titanium-900 mb-2">{drg.value}</div>
 <div className="text-xs text-titanium-400 mb-1">{drg.caseCount}</div>
 <div className={`text-xs font-medium ${drg.isPositive ? 'text-green-600' : 'text-crimson-600'}`}>
 {drg.variance}
 </div>
 </button>
 ))}
 </div>

 {/* DRG Summary Metrics */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-titanium-200">
 <div>
 <div className="text-xs text-titanium-400 mb-1">Current CMI</div>
 <div className="text-lg font-bold text-titanium-900">{config.drgMetrics.currentCMI}</div>
 </div>
 <div>
 <div className="text-xs text-titanium-400 mb-1">Monthly Opportunity</div>
 <div className="text-lg font-bold text-porsche-600">{config.drgMetrics.monthlyOpportunity}</div>
 </div>
 <div>
 <div className="text-xs text-titanium-400 mb-1">Documentation Rate</div>
 <div className="text-lg font-bold text-titanium-900">{config.drgMetrics.documentationRate}</div>
 </div>
 <div>
 <div className="text-xs text-titanium-400 mb-1">Avg LOS</div>
 <div className="text-lg font-bold text-titanium-900">{config.drgMetrics.avgLOS}</div>
 </div>
 </div>
 </div>

 {/* ── Base Executive View (existing shared component) ── */}
 <BaseExecutiveView config={config} />

 {/* ── Modals ──────────────────────────────────────────── */}
 {activeModal?.startsWith('drg-') && (
 <BaseDetailModal
 title={activeModal.replace('drg-', '')}
 subtitle="Case-level financial detail"
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
 onExport={() => console.log('Exporting DRG detail')}
 />
 )}

 {activeModal?.startsWith('month-') && (
 <BaseDetailModal
 title={`${activeModal.replace('month-', '')} Revenue Detail`}
 subtitle="Monthly projected vs realized breakdown"
 icon={<ChartIcon />}
 summaryMetrics={(() => {
 const m = valvularMonthlyData.find(d => activeModal.includes(d.month));
 if (!m) return [];
 const gap = m.projected - m.realized;
 return [
 { label: 'Projected', value: `$${(m.projected / 1000000).toFixed(1)}M`, color: 'porsche' as const },
 { label: 'Realized', value: `$${(m.realized / 1000000).toFixed(1)}M`, color: 'green' as const },
 { label: 'Gap', value: `$${(gap / 1000000).toFixed(1)}M`, color: gap > 500000 ? 'red' as const : 'amber' as const },
 { label: 'Capture Rate', value: `${((m.realized / m.projected) * 100).toFixed(1)}%` },
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
 const b = valvularBenchmarks.find(m => activeModal.includes(m.metric));
 if (!b) return [];
 return [
 { label: 'Our Value', value: `${b.ourValue}${b.unit}`, color: 'porsche' as const },
 { label: 'Benchmark', value: `${b.benchmark}${b.unit}` },
 { label: 'Percentile', value: `${b.percentile}th`, color: b.percentile >= 75 ? 'green' as const : 'amber' as const },
 { label: 'Trend', value: b.trend === 'up' ? 'Improving' : b.trend === 'down' ? (b.lowerIsBetter ? 'Improving' : 'Declining') : 'Stable' },
 ];
 })()}
 onClose={() => setActiveModal(null)}
 />
 )}

 {activeModal?.startsWith('category-') && (() => {
 const label = activeModal.replace('category-', '');
 const cat = valvularWaterfallCategories.find(c => c.label === label);
 return (
 <BaseDetailModal
 title={label}
 subtitle="Revenue Opportunity Category Detail"
 icon={<DollarIcon />}
 summaryMetrics={[
 { label: 'Annual Opportunity', value: cat ? `${(cat.value / 1000000).toFixed(1)}M` : 'N/A', colorScheme: 'porsche' },
 { label: 'Share of Total', value: cat ? `${((cat.value / 51700000) * 100).toFixed(1)}%` : 'N/A' },
 { label: 'Realized', value: `${((cat?.value || 0) * 0.74 / 1000000).toFixed(1)}M`, colorScheme: 'green' },
 { label: 'Gap', value: `${((cat?.value || 0) * 0.26 / 1000000).toFixed(1)}M`, colorScheme: 'amber' },
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
 icon={<HeartIcon />}
 summaryMetrics={[
 { label: 'Patients', value: zipInfo?.patientCount?.toString() || '0', colorScheme: 'porsche' },
 { label: 'Risk Score', value: zipInfo?.riskScore?.toFixed(1) || 'N/A', colorScheme: zipInfo && zipInfo.riskScore >= 7 ? 'crimson' : 'amber' },
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
