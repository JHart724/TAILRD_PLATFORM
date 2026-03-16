import React, { useState } from 'react';
import { DollarSign, Users, TrendingUp, Target, Activity, Heart } from 'lucide-react';
import BaseExecutiveView from '../../../components/shared/BaseExecutiveView';
import { coronaryInterventionConfig } from '../config/executiveConfig';
import ExportButton from '../../../components/shared/ExportButton';
import ZipHeatMap from '../../../components/shared/ZipHeatMap';
import SharedROIWaterfall from '../../../components/shared/SharedROIWaterfall';
import SharedBenchmarksPanel from '../../../components/shared/SharedBenchmarksPanel';
import SharedProjectedVsRealized from '../../../components/shared/SharedProjectedVsRealized';
import BaseDetailModal from '../../../components/shared/BaseDetailModal';
import CADFinancialWaterfall from '../components/executive/CADFinancialWaterfall';
import { ExportData } from '../../../utils/dataExport';
import { getOrdinalSuffix, formatMillions, toFixed, roundTo } from '../../../utils/formatters';

const CoronaryExecutiveView: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<any>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<any>(null);
  const [selectedDRG, setSelectedDRG] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);

  // Coronary-specific revenue categories
  const roiCategories = [
 { label: 'Complex PCI', value: 24800000, color: 'bg-porsche-500' },
 { label: 'STEMI Protocol', value: 18600000, color: 'bg-crimson-500' },
 { label: 'FFR/iFR Guidance', value: 12400000, color: 'bg-arterial-500' },
 { label: 'Cath Lab Efficiency', value: 8900000, color: 'bg-teal-500' },
 { label: 'Stent Optimization', value: 6200000, color: 'bg-amber-500' },
  ];

  // Coronary benchmark metrics
  const benchmarks = [
 { metric: 'Door-to-Balloon Time', ourValue: 58, benchmark: 90, unit: ' min', trend: 'down' as const, percentile: 88, lowerIsBetter: true },
 { metric: 'PCI Success Rate', ourValue: 94, benchmark: 92, unit: '%', trend: 'up' as const, percentile: 76 },
 { metric: 'STEMI Activation', ourValue: 96, benchmark: 90, unit: '%', trend: 'up' as const, percentile: 82 },
 { metric: 'FFR Utilization', ourValue: 42, benchmark: 35, unit: '%', trend: 'up' as const, percentile: 74 },
 { metric: 'In-Hospital Mortality', ourValue: 2.1, benchmark: 3.8, unit: '%', trend: 'down' as const, percentile: 85, lowerIsBetter: true },
 { metric: 'Radial Access Rate', ourValue: 78, benchmark: 65, unit: '%', trend: 'up' as const, percentile: 80 },
  ];

  // Monthly projected vs realized data
  const monthlyData = [
 { month: 'Jan', projected: 7200000, realized: 5800000 },
 { month: 'Feb', projected: 7400000, realized: 6100000 },
 { month: 'Mar', projected: 7800000, realized: 6500000 },
 { month: 'Apr', projected: 7500000, realized: 6200000 },
 { month: 'May', projected: 7900000, realized: 6800000 },
 { month: 'Jun', projected: 8200000, realized: 7100000 },
 { month: 'Jul', projected: 8000000, realized: 6900000 },
 { month: 'Aug', projected: 8400000, realized: 7400000 },
 { month: 'Sep', projected: 8600000, realized: 7600000 },
 { month: 'Oct', projected: 8800000, realized: 7900000 },
  ];

  // DRG data for drill-down modals
  const getDRGData = (drgCode: string) => {
 const drgData: Record<string, any> = {
 'DRG 246': {
 drgCode: 'DRG 246', description: 'PTCA w/ Drug-Eluting Stent',
 volume: 892, avgReimbursement: 39020, totalRevenue: 34805840,
 avgLos: 2.4, avgCost: 28500, margin: 27.0,
 targetLos: 2.0, hospitalAvgLos: 2.8, nationalBenchmarkLos: 3.1,
 cases: [
 { caseId: 'CAD-246-001', ageRange: '65-74', los: 2.1, cost: 26000, revenue: 39020, margin: 13020, marginPercent: 33.4 },
 { caseId: 'CAD-246-002', ageRange: '55-64', los: 1.8, cost: 24200, revenue: 39020, margin: 14820, marginPercent: 38.0 },
 { caseId: 'CAD-246-003', ageRange: '75-84', los: 3.2, cost: 34800, revenue: 39020, margin: 4220, marginPercent: 10.8 },
 { caseId: 'CAD-246-004', ageRange: '45-54', los: 1.6, cost: 22800, revenue: 39020, margin: 16220, marginPercent: 41.6 },
 { caseId: 'CAD-246-005', ageRange: '65-74', los: 2.5, cost: 29400, revenue: 39020, margin: 9620, marginPercent: 24.7 },
 { caseId: 'CAD-246-006', ageRange: '55-64', los: 2.0, cost: 25600, revenue: 39020, margin: 13420, marginPercent: 34.4 },
 { caseId: 'CAD-246-007', ageRange: '75-84', los: 3.8, cost: 38200, revenue: 39020, margin: 820, marginPercent: 2.1 },
 { caseId: 'CAD-246-008', ageRange: '85+', los: 4.2, cost: 42000, revenue: 39020, margin: -2980, marginPercent: -7.6 },
 { caseId: 'CAD-246-009', ageRange: '45-54', los: 1.5, cost: 21800, revenue: 39020, margin: 17220, marginPercent: 44.1 },
 { caseId: 'CAD-246-010', ageRange: '65-74', los: 2.3, cost: 27600, revenue: 39020, margin: 11420, marginPercent: 29.3 },
 ]
 },
 'DRG 247': {
 drgCode: 'DRG 247', description: 'PTCA w/o Drug-Eluting Stent',
 volume: 456, avgReimbursement: 40790, totalRevenue: 18600240,
 avgLos: 2.8, avgCost: 32400, margin: 20.6,
 targetLos: 2.5, hospitalAvgLos: 3.2, nationalBenchmarkLos: 3.5,
 cases: [
 { caseId: 'CAD-247-001', ageRange: '65-74', los: 2.4, cost: 29800, revenue: 40790, margin: 10990, marginPercent: 26.9 },
 { caseId: 'CAD-247-002', ageRange: '75-84', los: 3.6, cost: 38200, revenue: 40790, margin: 2590, marginPercent: 6.3 },
 { caseId: 'CAD-247-003', ageRange: '55-64', los: 2.0, cost: 27400, revenue: 40790, margin: 13390, marginPercent: 32.8 },
 { caseId: 'CAD-247-004', ageRange: '45-54', los: 1.8, cost: 25600, revenue: 40790, margin: 15190, marginPercent: 37.2 },
 { caseId: 'CAD-247-005', ageRange: '85+', los: 4.1, cost: 42800, revenue: 40790, margin: -2010, marginPercent: -4.9 },
 ]
 },
 };
 return drgData[drgCode];
  };

  // Benchmark detail data for modals
  const getBenchmarkDetails = (metric: string) => {
 const bm = benchmarks.find(b => b.metric === metric);
 if (!bm) return null;
 return {
 benchmarkName: bm.metric,
 description: `Performance comparison for ${bm.metric}`,
 ourValue: bm.ourValue, nationalValue: bm.benchmark,
 percentile: bm.percentile, unit: bm.unit,
 trendData: [
 { month: 'May', value: bm.ourValue * 0.92 },
 { month: 'Jun', value: bm.ourValue * 0.94 },
 { month: 'Jul', value: bm.ourValue * 0.96 },
 { month: 'Aug', value: bm.ourValue * 0.97 },
 { month: 'Sep', value: bm.ourValue * 0.99 },
 { month: 'Oct', value: bm.ourValue },
 ],
 comparisonData: {
 top10: bm.benchmark * 1.25,
 top25: bm.benchmark * 1.15,
 top50: bm.benchmark * 1.05,
 national: bm.benchmark,
 },
 };
  };

  const handleMonthClick = (monthData: { month: string; projected: number; realized: number }) => {
 setSelectedMonth({
 month: monthData.month,
 projected: monthData.projected,
 realized: monthData.realized,
 breakdown: [
 { category: 'Complex PCI', projected: Math.round(monthData.projected * 0.35), realized: Math.round(monthData.realized * 0.33) },
 { category: 'STEMI', projected: Math.round(monthData.projected * 0.26), realized: Math.round(monthData.realized * 0.28) },
 { category: 'FFR/iFR', projected: Math.round(monthData.projected * 0.18), realized: Math.round(monthData.realized * 0.17) },
 { category: 'Cath Lab', projected: Math.round(monthData.projected * 0.13), realized: Math.round(monthData.realized * 0.14) },
 { category: 'Stents', projected: Math.round(monthData.projected * 0.08), realized: Math.round(monthData.realized * 0.08) },
 ],
 });
  };

  const coronaryZipData = [
 { zipCode: "10001", patientCount: 58, riskScore: 8.9, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
 { zipCode: "10002", patientCount: 51, riskScore: 8.1, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
 { zipCode: "10003", patientCount: 42, riskScore: 6.4, riskLevel: "Medium" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
 { zipCode: "10009", patientCount: 45, riskScore: 7.3, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
 { zipCode: "10010", patientCount: 39, riskScore: 6.0, riskLevel: "Medium" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
 { zipCode: "10012", patientCount: 54, riskScore: 8.5, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
 { zipCode: "10014", patientCount: 47, riskScore: 7.2, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
 { zipCode: "10023", patientCount: 46, riskScore: 7.4, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
 { zipCode: "10026", patientCount: 55, riskScore: 8.7, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
 { zipCode: "10027", patientCount: 50, riskScore: 7.9, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
  ];

  const handleZipClick = (zipCode: string) => {
 setSelectedZip(zipCode);
  };

  const generateExportData = (): ExportData => ({
 filename: 'coronary-intervention-executive-report',
 title: 'Coronary Intervention Executive Dashboard',
 headers: ['Metric', 'Value', 'Target', 'Variance'],
 rows: [
 ['Total Revenue Opportunity', coronaryInterventionConfig.kpiData.totalOpportunity, '$95M', '-$5.6M'],
 ['Patient Population', coronaryInterventionConfig.kpiData.totalPatients, '3,000', '-153'],
 ['Procedural Success Rate', coronaryInterventionConfig.kpiData.gdmtOptimization, '96%', '-2%'],
 ['Avg Revenue per Patient', coronaryInterventionConfig.kpiData.avgRoi, '$33,000', '-$1,600'],
 ['Current CMI', coronaryInterventionConfig.drgMetrics.currentCMI, '3.10', '-0.16'],
 ['Documentation Rate', coronaryInterventionConfig.drgMetrics.documentationRate, '96%', '-2.2%'],
 ['Average LOS', coronaryInterventionConfig.drgMetrics.avgLOS, '3.2 days', '-0.4 days'],
 ],
 metadata: {
 reportDate: new Date().toISOString(),
 module: 'Coronary Intervention',
 dataSource: 'TAILRD Analytics Platform',
 lastUpdated: '2024-01-15T10:30:00Z'
 }
  });

  return (
 <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>

 <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
 <div className="flex justify-end mb-6">
 <ExportButton
 data={generateExportData()}
 variant="outline"
 size="md"
 className="shadow-metal-2 hover:shadow-metal-3 transition-all duration-300"
 />
 </div>

 {/* KPI Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
 <div className="metal-card p-6">
 <div className="flex items-center gap-3 mb-3">
 <div className="p-2 bg-porsche-50 rounded-lg"><Users className="w-6 h-6 text-porsche-600" /></div>
 <span className="text-sm font-medium text-titanium-600">Patient Population</span>
 </div>
 <div className="text-3xl font-bold text-titanium-900">{coronaryInterventionConfig.kpiData.totalPatients}</div>
 <div className="text-sm text-titanium-500 mt-1">{coronaryInterventionConfig.kpiData.totalPatientsSub}</div>
 </div>
 <div className="metal-card p-6">
 <div className="flex items-center gap-3 mb-3">
 <div className="p-2 bg-green-50 rounded-lg"><DollarSign className="w-6 h-6 text-green-600" /></div>
 <span className="text-sm font-medium text-titanium-600">Revenue Opportunity</span>
 </div>
 <div className="text-3xl font-bold text-titanium-900">{coronaryInterventionConfig.kpiData.totalOpportunity}</div>
 <div className="text-sm text-titanium-500 mt-1">{coronaryInterventionConfig.kpiData.totalOpportunitySub}</div>
 </div>
 <div className="metal-card p-6">
 <div className="flex items-center gap-3 mb-3">
 <div className="p-2 bg-crimson-50 rounded-lg"><Activity className="w-6 h-6 text-crimson-600" /></div>
 <span className="text-sm font-medium text-titanium-600">Procedural Success</span>
 </div>
 <div className="text-3xl font-bold text-titanium-900">{coronaryInterventionConfig.kpiData.gdmtOptimization}</div>
 <div className="text-sm text-titanium-500 mt-1">{coronaryInterventionConfig.kpiData.gdmtOptimizationSub}</div>
 </div>
 <div className="metal-card p-6">
 <div className="flex items-center gap-3 mb-3">
 <div className="p-2 bg-amber-50 rounded-lg"><TrendingUp className="w-6 h-6 text-amber-600" /></div>
 <span className="text-sm font-medium text-titanium-600">Avg Revenue / Patient</span>
 </div>
 <div className="text-3xl font-bold text-titanium-900">{coronaryInterventionConfig.kpiData.avgRoi}</div>
 <div className="text-sm text-titanium-500 mt-1">{coronaryInterventionConfig.kpiData.avgRoiSub}</div>
 </div>
 </div>

 {/* Revenue Opportunity Waterfall */}
 <div className="metal-card mb-6">
 <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
 <h3 className="text-xl font-bold text-titanium-900 mb-1">Revenue Opportunity Waterfall</h3>
 <p className="text-sm text-titanium-500">Annual revenue opportunity by coronary intervention category</p>
 </div>
 <div className="p-6">
 <SharedROIWaterfall
 categories={roiCategories}
 totalRevenue={70900000}
 realizedRevenue={52200000}
 onCategoryClick={(label) => setSelectedCategory(label)}
 />
 </div>
 </div>

 {/* 2-Column: Projected vs Realized + Benchmarks */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
 <div className="metal-card">
 <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
 <h3 className="text-lg font-semibold text-titanium-900 mb-1">Projected vs Realized Revenue</h3>
 <p className="text-sm text-titanium-500">Revenue tracking and variance analysis</p>
 </div>
 <div className="p-6">
 <SharedProjectedVsRealized monthlyData={monthlyData} onMonthClick={handleMonthClick} />
 </div>
 </div>
 <div className="metal-card">
 <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
 <h3 className="text-lg font-semibold text-titanium-900 mb-1">Performance Benchmarks</h3>
 <p className="text-sm text-titanium-500">National comparison metrics</p>
 </div>
 <div className="p-6">
 <SharedBenchmarksPanel
 benchmarks={benchmarks}
 subtitle="Mount Sinai vs National Percentiles (2025 Data)"
 dataSource="ACC NCDR CathPCI Registry 2024"
 lastUpdated="October 2025"
 onBenchmarkClick={(metric) => setSelectedBenchmark(getBenchmarkDetails(metric))}
 />
 </div>
 </div>
 </div>

 {/* Geographic Heat Map */}
 <div className="mb-6">
 <ZipHeatMap
 title="High-Risk CAD/DM + Chest Pain Geographic Distribution"
 data={coronaryZipData}
 onZipClick={handleZipClick}
 centerLat={40.7589}
 centerLng={-73.9851}
 zoom={12}
 />
 </div>

 {/* Financial ROI Waterfall */}
 <div className="metal-card mb-6">
 <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
 <h3 className="text-xl font-bold text-titanium-900 mb-1">Coronary Intervention ROI Analysis</h3>
 <p className="text-sm text-titanium-500">Revenue opportunity by intervention with patient-level impact</p>
 </div>
 <div className="p-6">
 <CADFinancialWaterfall />
 </div>
 </div>

 {/* Base Executive View - DRG Performance */}
 <BaseExecutiveView config={coronaryInterventionConfig} />

 {/* Month Detail Modal */}
 {selectedMonth && (
 <BaseDetailModal
 title={`${selectedMonth.month} Revenue Analysis`}
 subtitle="Coronary Intervention Monthly Breakdown"
 description="Projected vs realized revenue by category"
 icon={<DollarSign className="w-6 h-6" />}
 summaryMetrics={[
 { label: 'Projected', value: formatMillions(selectedMonth.projected), colorScheme: 'porsche' },
 { label: 'Realized', value: formatMillions(selectedMonth.realized), colorScheme: 'green' },
 {
 label: 'Variance',
 value: formatMillions(Math.abs(selectedMonth.projected - selectedMonth.realized)),
 colorScheme: selectedMonth.realized >= selectedMonth.projected ? 'green' : 'amber',
 },
 ]}
 tableTitle="Revenue by Category"
 tableData={selectedMonth.breakdown}
 columns={[
 { key: 'category', label: 'Category' },
 { key: 'projected', label: 'Projected', align: 'right', format: 'money' },
 { key: 'realized', label: 'Realized', align: 'right', format: 'money' },
 ]}
 onClose={() => setSelectedMonth(null)}
 />
 )}

 {/* Benchmark Detail Modal */}
 {selectedBenchmark && (
 <BaseDetailModal
 title={selectedBenchmark.benchmarkName}
 subtitle="National Benchmark Comparison"
 description={selectedBenchmark.description}
 icon={<Target className="w-6 h-6" />}
 summaryMetrics={[
 { label: 'Our Performance', value: `${selectedBenchmark.ourValue}${selectedBenchmark.unit}`, colorScheme: 'porsche' },
 { label: 'National Benchmark', value: `${selectedBenchmark.nationalValue}${selectedBenchmark.unit}`, colorScheme: 'titanium' },
 { label: 'Percentile', value: `${selectedBenchmark.percentile}${getOrdinalSuffix(selectedBenchmark.percentile)}`, colorScheme: selectedBenchmark.percentile >= 75 ? 'green' : 'amber' },
 ]}
 onClose={() => setSelectedBenchmark(null)}
 />
 )}

 {/* DRG Detail Modal */}
 {selectedDRG && (
 <BaseDetailModal
 title={`DRG ${selectedDRG.drgCode}`}
 subtitle={selectedDRG.description}
 description={`Q4 2025 Performance - ${selectedDRG.volume} cases`}
 icon={<Heart className="w-6 h-6" />}
 summaryMetrics={[
 { label: 'Total Revenue', value: formatMillions(selectedDRG.totalRevenue), colorScheme: 'green', icon: <DollarSign className="w-8 h-8" /> },
 { label: 'Average LOS', value: `${selectedDRG.avgLos} days`, colorScheme: 'porsche' },
 { label: 'Average Cost', value: `$${toFixed(selectedDRG.avgCost / 1000, 1)}K`, colorScheme: 'arterial' },
 { label: 'Margin', value: `${selectedDRG.margin}%`, colorScheme: selectedDRG.margin >= 20 ? 'green' : 'amber' },
 ]}
 tableTitle="Top 10 Case Performance (De-identified)"
 tableData={selectedDRG.cases}
 columns={[
 { key: 'caseId', label: 'Case ID' },
 { key: 'ageRange', label: 'Age Range' },
 { key: 'los', label: 'LOS (days)', align: 'right' },
 { key: 'cost', label: 'Cost', align: 'right', format: 'money' },
 { key: 'revenue', label: 'Revenue', align: 'right', format: 'money' },
 { key: 'margin', label: 'Margin $', align: 'right', format: 'money' },
 {
 key: 'marginPercent', label: 'Margin %', align: 'right',
 render: (val: any) => (
 <span className={`px-2 py-1 rounded text-sm font-medium ${
 val >= 20 ? 'bg-green-50 text-green-700' : val >= 10 ? 'bg-amber-50 text-amber-700' : 'bg-crimson-50 text-crimson-700'
 }`}>
 {toFixed(val as number, 1)}%
 </span>
 ),
 },
 ]}
 onClose={() => setSelectedDRG(null)}
 />
 )}

 {/* Category Detail Modal */}
 {selectedCategory && (() => {
 const cat = roiCategories.find(c => c.label === selectedCategory);
 return (
 <BaseDetailModal
 title={selectedCategory}
 subtitle="Revenue Opportunity Category Detail"
 icon={<DollarSign className="w-6 h-6" />}
 summaryMetrics={[
 { label: 'Annual Opportunity', value: cat ? `${toFixed(cat.value / 1000000, 1)}M` : '\u2014', colorScheme: 'porsche' },
 { label: 'Share of Total', value: cat ? `${toFixed(cat.value / 70900000 * 100, 1)}%` : '\u2014' },
 { label: 'Realized', value: `${toFixed((cat?.value || 0) * 0.74 / 1000000, 1)}M`, colorScheme: 'green' },
 { label: 'Gap', value: `${toFixed((cat?.value || 0) * 0.26 / 1000000, 1)}M`, colorScheme: 'amber' },
 ]}
 onClose={() => setSelectedCategory(null)}
 />
 );
 })()}

 {/* ZIP Detail Modal */}
 {selectedZip && (() => {
 const zipInfo = coronaryZipData.find(z => z.zipCode === selectedZip);
 return (
 <BaseDetailModal
 title={`ZIP Code ${selectedZip}`}
 subtitle="High-Risk CAD Patient Summary"
 icon={<Heart className="w-6 h-6" />}
 summaryMetrics={[
 { label: 'Patients', value: zipInfo?.patientCount?.toString() || '0', colorScheme: 'porsche' },
 { label: 'Risk Score', value: zipInfo?.riskScore ? toFixed(zipInfo.riskScore, 1) : '\u2014', colorScheme: zipInfo && zipInfo.riskScore >= 7 ? 'crimson' : 'amber' },
 { label: 'Risk Level', value: zipInfo?.riskLevel || '\u2014' },
 { label: 'Condition', value: 'High-Risk CAD' },
 ]}
 onClose={() => setSelectedZip(null)}
 />
 );
 })()}
 </div>
 </div>
  );
};

export default CoronaryExecutiveView;
