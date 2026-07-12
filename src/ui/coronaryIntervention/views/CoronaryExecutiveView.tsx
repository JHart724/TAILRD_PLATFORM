import React, { useState } from 'react';
import { useModuleDashboard } from '../../../hooks/useModuleDashboard';
import { DollarSign, Target, Heart } from 'lucide-react';
import SharedDRGPerformance from '../../../components/shared/SharedDRGPerformance';
import { coronaryInterventionConfig } from '../config/executiveConfig';
import ExportButton from '../../../components/shared/ExportButton';
import ZipHeatMap from '../../../components/shared/ZipHeatMap';
import SharedROIWaterfall from '../../../components/shared/SharedROIWaterfall';
import SharedBenchmarksPanel from '../../../components/shared/SharedBenchmarksPanel';
import SharedProjectedVsRealized from '../../../components/shared/SharedProjectedVsRealized';
import BaseDetailModal from '../../../components/shared/BaseDetailModal';
import DemoDataBadge from '../../../components/shared/DemoDataBadge';
import GapIntelligenceCard from '../../../components/shared/GapIntelligenceCard';
import CADExecutiveSummary, { CADDashboardData } from '../components/CADExecutiveSummary';
import CADForwardOutlookPanel from '../components/CADForwardOutlookPanel';
import { ExportData } from '../../../utils/dataExport';
import { getOrdinalSuffix, formatMillions, toFixed, roundTo } from '../../../utils/formatters';
import {
  CAD_DEMO_WATERFALL,
  CAD_DEMO_ROI_CATEGORIES,
  CAD_DEMO_ANNUAL_OPPORTUNITY_M,
  CAD_DEMO_PVR,
  CAD_DEMO_CATEGORIES,
  CAD_DEMO_TOPGAPS,
  CAD_DEMO_SAFETY_ALERT,
} from '../config/cadDemoFinancials';

const CoronaryExecutiveView: React.FC = () => {
  // useModuleDashboard returns `data: any`; the CAD dashboard endpoint emits the
  // CADDashboardData contract (patient/gap/device counts), so type it here to drop `any`.
  const { data: dashboardRaw, loading: dashboardLoading, error: dashboardError } = useModuleDashboard('coronary-intervention');
  const dashboard = (dashboardRaw as CADDashboardData | null) ?? null;
  const [selectedMonth, setSelectedMonth] = useState<any>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<any>(null);
  const [selectedDRG, setSelectedDRG] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);

  // Coronary benchmark metrics
  const benchmarks = [
 { metric: 'Door-to-Balloon Time', ourValue: 58, benchmark: 90, unit: ' min', trend: 'down' as const, percentile: 88, lowerIsBetter: true },
 { metric: 'PCI Success Rate', ourValue: 94, benchmark: 92, unit: '%', trend: 'up' as const, percentile: 76 },
 { metric: 'STEMI Activation', ourValue: 96, benchmark: 90, unit: '%', trend: 'up' as const, percentile: 82 },
 { metric: 'FFR Utilization', ourValue: 42, benchmark: 35, unit: '%', trend: 'up' as const, percentile: 74 },
 { metric: 'In-Hospital Mortality', ourValue: 2.1, benchmark: 3.8, unit: '%', trend: 'down' as const, percentile: 85, lowerIsBetter: true },
 { metric: 'Radial Access Rate', ourValue: 78, benchmark: 65, unit: '%', trend: 'up' as const, percentile: 80 },
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
 ['Total Revenue Opportunity (gap-closure, demo)', `$${CAD_DEMO_ANNUAL_OPPORTUNITY_M.toFixed(1)}M`, '-', '-'],
 ['Patient Population (live)', dashboard?.summary?.totalPatients?.toLocaleString() ?? 'pending', '-', '-'],
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
      {/* Tier header - Export folded in as a right-aligned utility (closes the CAD-side
          AUDIT-161 export-above-headline inversion; the first SECTION is now the KPI
          summary, matching the HF/EP/SH exemplar). */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold font-display text-titanium-800">Coronary Intervention Executive Dashboard</h2>
        <ExportButton
          data={generateExportData()}
          variant="outline"
          size="sm"
          className="shadow-sm hover:shadow-md transition-all duration-300"
        />
      </div>

      {/* 1. KPI summary - live patients / open gaps / device candidates + 3 demo cards.
          The SAQ PRO card + the inline KPI block are dissolved: live tiles merged here,
          PRO framing lives on the CAD SL saq-outcomes tab (SAQOutcomesPanel). */}
      <CADExecutiveSummary dashboard={dashboard} loading={dashboardLoading} error={dashboardError} />

      {/* 2. Clinical Gap Intelligence - live headline (totalOpenGaps + real totalPatients),
          demo-badged composition (donut / top-gaps / safety are illustrative). */}
      <GapIntelligenceCard
        data={{
          totalGaps: dashboard?.summary?.totalOpenGaps ?? 0,
          categories: CAD_DEMO_CATEGORIES,
          topGaps: CAD_DEMO_TOPGAPS,
          safetyAlert: CAD_DEMO_SAFETY_ALERT,
        }}
        totalPatients={dashboard?.summary?.totalPatients ?? 0}
        compositionDemo
      />

      {/* 3. Revenue Opportunity Waterfall - the SINGLE consolidated waterfall, fed from
          the one $11.2M cadDemoFinancials model (the redundant 70.9M / 50.9M waterfalls
          are removed; program revenue is not an exec-tier gap-opportunity figure). */}
      <div className="metal-card mb-6">
        <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-titanium-900 mb-1">Revenue Opportunity Waterfall</h3>
              <p className="text-sm text-titanium-500">Annual gap-closure opportunity by coronary intervention category</p>
            </div>
            <DemoDataBadge />
          </div>
        </div>
        <div className="p-6">
          <SharedROIWaterfall
            categories={CAD_DEMO_ROI_CATEGORIES}
            totalRevenue={CAD_DEMO_WATERFALL.total_revenue * 1000000}
            realizedRevenue={CAD_DEMO_WATERFALL.realized_revenue * 1000000}
            onCategoryClick={(label) => setSelectedCategory(label)}
          />
        </div>
      </div>

      {/* 4. DRG / CMI performance - promoted from last (SharedDRGPerformance, demo-badged
          via the new opt-in demoBadge prop; VHD/PV render unchanged). */}
      <SharedDRGPerformance config={coronaryInterventionConfig} demoBadge />

      {/* 5. Projected vs Realized + Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="metal-card">
          <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-titanium-900 mb-1">Projected vs Realized Revenue</h3>
                <p className="text-sm text-titanium-500">Revenue tracking and variance analysis</p>
              </div>
              <DemoDataBadge />
            </div>
          </div>
          <div className="p-6">
            <SharedProjectedVsRealized
              monthlyData={CAD_DEMO_PVR.months}
              onMonthClick={handleMonthClick}
              gapSublabel="Immediate at-risk slice (this quarter) - see Revenue at Risk"
              cleanSurface
            />
          </div>
        </div>
        <div className="metal-card">
          <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-titanium-900 mb-1">Performance Benchmarks</h3>
                <p className="text-sm text-titanium-500">National comparison metrics</p>
              </div>
              <DemoDataBadge label="Demo benchmarks - national comparison pending" />
            </div>
          </div>
          <div className="p-6">
            <SharedBenchmarksPanel
              benchmarks={benchmarks}
              subtitle="Your System vs National Percentiles (2025 Data)"
              dataSource="ACC NCDR CathPCI Registry 2024"
              lastUpdated="October 2025"
              onBenchmarkClick={(metric) => setSelectedBenchmark(getBenchmarkDetails(metric))}
            />
          </div>
        </div>
      </div>

      {/* 6. Forward Outlook - consolidated 12-month projection (replaces the former
          pipeline / at-risk / trajectory / predictive cluster). Its DemoDataBadge is internal. */}
      <CADForwardOutlookPanel />

      {/* 7. Geographic Heat Map */}
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
 val >= 20 ? 'bg-chrome-50 text-teal-700' : val >= 10 ? 'bg-[#fdf0f2] text-red-600' : 'bg-crimson-50 text-crimson-700'
 }`}>
 {toFixed(val as number, 1)}%
 </span>
 ),
 },
 ]}
 onClose={() => setSelectedDRG(null)}
 />
 )}

 {/* Category Detail Modal - reads the single cadDemoFinancials model; realized/gap
     shares are DERIVED from the model's realized ratio (no unsourced multipliers). */}
 {selectedCategory && (() => {
 const cat = CAD_DEMO_ROI_CATEGORIES.find(c => c.label === selectedCategory);
 const realizedRatio = CAD_DEMO_WATERFALL.realized_revenue / CAD_DEMO_WATERFALL.total_revenue;
 return (
 <BaseDetailModal
 title={selectedCategory}
 subtitle="Revenue Opportunity Category Detail"
 icon={<DollarSign className="w-6 h-6" />}
 demoBadge
 summaryMetrics={[
 { label: 'Annual Opportunity', value: cat ? `${toFixed(cat.value / 1000000, 1)}M` : '\u2014', colorScheme: 'porsche' },
 { label: 'Share of Total', value: cat ? `${toFixed(cat.value / (CAD_DEMO_ANNUAL_OPPORTUNITY_M * 1000000) * 100, 1)}%` : '\u2014' },
 { label: 'Realized', value: `${toFixed((cat?.value || 0) * realizedRatio / 1000000, 1)}M`, colorScheme: 'green' },
 { label: 'Gap', value: `${toFixed((cat?.value || 0) * (1 - realizedRatio) / 1000000, 1)}M`, colorScheme: 'amber' },
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
