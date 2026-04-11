import React, { useEffect, useState } from 'react';
import { DollarSign, Users, TrendingUp, Target, ChevronRight, Zap, Info, Search } from 'lucide-react';
import { getHeartFailureDashboard, HFDashboardData } from '../../../services/api';
import BaseExecutiveView from '../../../components/shared/BaseExecutiveView';
import KPICard from '../../../components/shared/KPICard';
import { heartFailureConfig } from '../config/executiveConfig';
import ExportButton from '../../../components/shared/ExportButton';
import FinancialROIWaterfall from '../components/executive/FinancialROIWaterfall';
import ZipHeatMap from '../../../components/shared/ZipHeatMap';
import ROIWaterfall from '../components/ROIWaterfall';
import BenchmarksPanel from '../components/BenchmarksPanel';
import ProjectedVsRealizedChart from '../components/ProjectedVsRealizedChart';
import OpportunityHeatmap from '../components/OpportunityHeatmap';
import { ExportData } from '../../../utils/dataExport';
import { toFixed } from '../../../utils/formatters';
import { HFExecutiveSummary } from '../../../components/heartFailure/HFExecutiveSummary';
import GapIntelligenceCard from '../../../components/shared/GapIntelligenceCard';
import GapResponseRateCard from '../../../components/shared/GapResponseRateCard';
import PredictiveMetricsBanner from '../../../components/shared/PredictiveMetricsBanner';
import { RevenuePipelineCard, RevenueAtRiskCard, TrajectoryTrendsCard } from '../../../components/shared/ForwardLookingCards';
import type { RevenuePipelineData, RevenueAtRiskData, TrajectoryTrendsData } from '../../../components/shared/ForwardLookingCards';
import { HFRevenueWaterfallModal } from '../../../components/heartFailure/HFRevenueWaterfallModal';
import HFMonthDetailModal from '../../../components/heartFailure/HFMonthDetailModal';
import HFBenchmarkDetailModal from '../../../components/heartFailure/HFBenchmarkDetailModal';
import HFRevenueOpportunityModal from '../../../components/heartFailure/HFRevenueOpportunityModal';
import BaseDetailModal from '../../../components/shared/BaseDetailModal';
import { Heart } from 'lucide-react';

const ExecutiveView: React.FC = () => {
  const [selectedWaterfallCategory, setSelectedWaterfallCategory] = useState<'GDMT' | 'Devices' | 'Phenotypes' | '340B' | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<any>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<any>(null);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);

  // Real-data dashboard fetch
  const [dashboard, setDashboard] = useState<HFDashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDashboardLoading(true);
    getHeartFailureDashboard()
      .then(data => { if (!cancelled) { setDashboard(data); setDashboardError(null); } })
      .catch(err => { if (!cancelled) setDashboardError(err?.message ?? 'Failed to load dashboard'); })
      .finally(() => { if (!cancelled) setDashboardLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Get category-specific revenue and patient data
  const getCategoryData = (category: string) => {
 const categoryData: Record<string, { revenue: number; patientCount: number }> = {
 GDMT: { revenue: 2400000, patientCount: 1050 },
 Devices: { revenue: 1800000, patientCount: 80 },
 Phenotypes: { revenue: 1200000, patientCount: 105 },
 '340B': { revenue: 800000, patientCount: 460 }
 };
 return categoryData[category] || { revenue: 0, patientCount: 0 };
  };

  // Generate breakdown data for month detail modal
  const generateMonthBreakdown = (month: string, projected: number, realized: number) => {
 // Calculate proportional breakdown based on annual totals
 const projectedRatio = projected / 1000000; // Base ratio
 const realizedRatio = realized / 1000000;
 
 return [
 { 
 category: 'GDMT', 
 projected: Math.round(projectedRatio * 400000), 
 realized: Math.round(realizedRatio * 380000) 
 },
 { 
 category: 'Devices', 
 projected: Math.round(projectedRatio * 300000), 
 realized: Math.round(realizedRatio * 290000) 
 },
 { 
 category: 'Phenotypes', 
 projected: Math.round(projectedRatio * 200000), 
 realized: Math.round(realizedRatio * 190000) 
 },
 { 
 category: '340B', 
 projected: Math.round(projectedRatio * 100000), 
 realized: Math.round(realizedRatio * 95000) 
 }
 ];
  };

  // Handle month click from ProjectedVsRealizedChart
  const handleMonthClick = (monthData: { month: string; projected: number; realized: number }) => {
 const breakdown = generateMonthBreakdown(monthData.month, monthData.projected, monthData.realized);
 setSelectedMonth({
 month: monthData.month,
 projected: monthData.projected,
 realized: monthData.realized,
 breakdown
 });
  };

  // Generate benchmark detail data
  const getBenchmarkData = (metric: string) => {
 const benchmarkDetails: Record<string, any> = {
 'Quadruple Therapy Rate': {
 benchmarkName: 'Quadruple Therapy Rate',
 description: 'Percentage of HFrEF patients on 4-pillar GDMT (ACEi/ARB/ARNI, BB, MRA, SGLT2i)',
 ourValue: 68,
 nationalValue: 52,
 percentile: 78,
 unit: '%',
 trendData: [
 { month: 'Jun', value: 62 },
 { month: 'Jul', value: 64 },
 { month: 'Aug', value: 66 },
 { month: 'Sep', value: 67 },
 { month: 'Oct', value: 68 },
 { month: 'Nov', value: 68 }
 ],
 comparisonData: { top10: 85, top25: 75, top50: 62, national: 52 }
 },
 'CRT Utilization': {
 benchmarkName: 'CRT Utilization',
 description: 'Percentage of eligible HF patients with CRT-D or CRT-P devices',
 ourValue: 45,
 nationalValue: 38,
 percentile: 72,
 unit: '%',
 trendData: [
 { month: 'Jun', value: 41 },
 { month: 'Jul', value: 42 },
 { month: 'Aug', value: 43 },
 { month: 'Sep', value: 44 },
 { month: 'Oct', value: 45 },
 { month: 'Nov', value: 45 }
 ],
 comparisonData: { top10: 65, top25: 55, top50: 45, national: 38 }
 },
 'Target Dose BB': {
 benchmarkName: 'Target Dose Beta Blocker',
 description: 'Percentage of HF patients on target or maximum tolerated beta blocker dose',
 ourValue: 71,
 nationalValue: 65,
 percentile: 68,
 unit: '%',
 trendData: [
 { month: 'Jun', value: 68 },
 { month: 'Jul', value: 69 },
 { month: 'Aug', value: 70 },
 { month: 'Sep', value: 71 },
 { month: 'Oct', value: 71 },
 { month: 'Nov', value: 71 }
 ],
 comparisonData: { top10: 88, top25: 78, top50: 70, national: 65 }
 },
 'SGLT2i Adoption': {
 benchmarkName: 'SGLT2i Adoption',
 description: 'Percentage of eligible HFrEF patients prescribed SGLT2 inhibitors',
 ourValue: 64,
 nationalValue: 48,
 percentile: 82,
 unit: '%',
 trendData: [
 { month: 'Jun', value: 58 },
 { month: 'Jul', value: 60 },
 { month: 'Aug', value: 61 },
 { month: 'Sep', value: 63 },
 { month: 'Oct', value: 64 },
 { month: 'Nov', value: 64 }
 ],
 comparisonData: { top10: 78, top25: 68, top50: 55, national: 48 }
 },
 '30-Day Readmission': {
 benchmarkName: '30-Day Readmission Rate',
 description: 'Percentage of HF patients readmitted within 30 days of discharge',
 ourValue: 18,
 nationalValue: 23,
 percentile: 71,
 unit: '%',
 trendData: [
 { month: 'Jun', value: 20 },
 { month: 'Jul', value: 19 },
 { month: 'Aug', value: 18 },
 { month: 'Sep', value: 18 },
 { month: 'Oct', value: 18 },
 { month: 'Nov', value: 18 }
 ],
 comparisonData: { top10: 12, top25: 15, top50: 20, national: 23 }
 },
 'Phenotype Detection Rate': {
 benchmarkName: 'Phenotype Detection Rate',
 description: 'Percentage of HF patients with identified specific phenotypes (amyloid, iron deficiency, etc.)',
 ourValue: 12,
 nationalValue: 8,
 percentile: 85,
 unit: '%',
 trendData: [
 { month: 'Jun', value: 9 },
 { month: 'Jul', value: 10 },
 { month: 'Aug', value: 11 },
 { month: 'Sep', value: 11 },
 { month: 'Oct', value: 12 },
 { month: 'Nov', value: 12 }
 ],
 comparisonData: { top10: 18, top25: 14, top50: 10, national: 8 }
 }
 };
 return benchmarkDetails[metric] || null;
  };

  // Handle benchmark click
  const handleBenchmarkClick = (benchmarkMetric: string) => {
 const benchmarkData = getBenchmarkData(benchmarkMetric);
 if (benchmarkData) {
 setSelectedBenchmark(benchmarkData);
 }
  };

  // Facility-level drill-down is deferred to Sprint C (wire to real provider
  // data from backend). Click is a no-op to avoid rendering fake provider
  // names.
  const handleFacilityClick = (_facilityName: string) => {
    // TODO(Sprint-C): fetch /api/modules/heart-failure/facilities and open modal
  };

  // Handle revenue opportunity click
  const handleOpportunityClick = () => {
 setShowOpportunityModal(true);
  };

  // DRG case-level drill-down deferred to Sprint C. Case IDs must come from
  // real DRG billing data — not hardcoded synthetic cases.

  // Sample ZIP code data for decompensation risk & readmission hotspots
  const heartFailureZipData = [
 { zipCode: "10001", patientCount: 64, riskScore: 8.9, riskLevel: "High" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10002", patientCount: 58, riskScore: 8.4, riskLevel: "High" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10003", patientCount: 45, riskScore: 6.7, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10009", patientCount: 52, riskScore: 7.8, riskLevel: "High" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10010", patientCount: 41, riskScore: 6.2, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10011", patientCount: 38, riskScore: 5.6, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10012", patientCount: 59, riskScore: 8.6, riskLevel: "High" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10013", patientCount: 46, riskScore: 7.1, riskLevel: "High" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10014", patientCount: 50, riskScore: 7.5, riskLevel: "High" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10016", patientCount: 43, riskScore: 6.5, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10017", patientCount: 37, riskScore: 5.4, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10018", patientCount: 47, riskScore: 7.2, riskLevel: "High" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "75003", patientCount: 42, riskScore: 6.3, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10021", patientCount: 33, riskScore: 4.8, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10022", patientCount: 35, riskScore: 5.1, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10023", patientCount: 49, riskScore: 7.6, riskLevel: "High" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10024", patientCount: 44, riskScore: 6.8, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "75002", patientCount: 46, riskScore: 7.0, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10026", patientCount: 61, riskScore: 9.2, riskLevel: "High" as const, conditionType: "HF Decompensation Risk" },
 { zipCode: "10027", patientCount: 55, riskScore: 8.7, riskLevel: "High" as const, conditionType: "HF Decompensation Risk" }
  ];

  const handleZipClick = (zipCode: string) => {
 setSelectedZip(zipCode);
  };

  // Generate export data
  const generateExportData = (): ExportData => {
 return {
 filename: 'heart-failure-executive-report',
 title: 'Heart Failure Executive Dashboard',
 headers: ['Metric', 'Value', 'Target', 'Variance'],
 rows: [
 ['Total Revenue Opportunity', heartFailureConfig.kpiData.totalOpportunity, '$70M', '-$1.2M'],
 ['Patient Population', heartFailureConfig.kpiData.totalPatients, '2,500', '-6'],
 ['GDMT Optimization', heartFailureConfig.kpiData.gdmtOptimization, '50%', '-12%'],
 ['Avg Revenue per Patient', heartFailureConfig.kpiData.avgRoi, '$30,000', '-$2,400'],
 ['Current CMI', heartFailureConfig.drgMetrics.currentCMI, '2.30', '-0.02'],
 ['Documentation Rate', heartFailureConfig.drgMetrics.documentationRate, '95%', '-3.8%'],
 ['Average LOS', heartFailureConfig.drgMetrics.avgLOS, '3.5 days', '+0.3 days'],
 ],
 metadata: {
 reportDate: new Date().toISOString(),
 module: 'Heart Failure',
 dataSource: 'TAILRD Analytics Platform',
 lastUpdated: '2024-01-15T10:30:00Z'
 }
 };
  };

  return (
 <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>
 
 <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
 {/* Export Button - Clean Integration */}
 <div className="flex justify-end mb-6">
 <ExportButton 
 data={generateExportData()}
 variant="outline"
 size="md"
 className="shadow-lg hover:shadow-xl transition-all duration-300"
 />
 </div>

 {/* #1: Enhanced Interactive Executive Summary */}
 <HFExecutiveSummary />

 {/* KCCQ Patient-Reported Outcomes Executive Card */}
 <div className="metal-card relative z-10 mb-6">
   <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
     <div className="flex items-center justify-between">
       <div>
         <h3 className="text-lg font-semibold text-titanium-900 mb-1">Patient-Reported Outcomes (KCCQ)</h3>
         <p className="text-sm text-titanium-600">Kansas City Cardiomyopathy Questionnaire &mdash; developed by Dr. John Spertus, Saint Luke&rsquo;s Mid America Heart Institute / UMKC</p>
       </div>
       <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
         <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
         <span className="text-xs text-blue-700 font-medium">Auto-calculated from EHR integration</span>
       </div>
     </div>
   </div>
   <div className="p-6">
     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
       {dashboardLoading ? (
         <div className="col-span-4 animate-pulse h-24 bg-titanium-100 rounded-xl" />
       ) : dashboardError ? (
         <div className="col-span-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
           Failed to load Heart Failure metrics: {dashboardError}
         </div>
       ) : dashboard && dashboard.summary.totalPatients > 0 ? (
         <>
           <div className="bg-white rounded-xl p-4 border border-titanium-200 shadow-sm">
             <div className="text-sm text-titanium-600 mb-1">Total HF Patients</div>
             <div className="text-3xl font-bold text-titanium-900">{dashboard.summary.totalPatients.toLocaleString()}</div>
             <div className="text-xs text-titanium-500 mt-1">Active HF panel</div>
           </div>
           <div className="bg-white rounded-xl p-4 border border-red-200 shadow-sm">
             <div className="text-sm text-titanium-600 mb-1">Open Therapy Gaps</div>
             <div className="text-3xl font-bold text-red-600">{dashboard.summary.totalOpenGaps.toLocaleString()}</div>
             <div className="text-xs text-red-500 mt-1">Recommended for review</div>
           </div>
           <div className="bg-white rounded-xl p-4 border border-titanium-300 shadow-sm">
             <div className="text-sm text-titanium-600 mb-1">GDMT Optimized</div>
             <div className="text-3xl font-bold text-teal-700">{dashboard.summary.gdmtOptimized.toLocaleString()}</div>
             <div className="text-xs text-teal-500 mt-1">No unresolved medication gaps</div>
           </div>
           <div className="bg-white rounded-xl p-4 border border-[#f5c6cf] shadow-sm">
             <div className="text-sm text-titanium-600 mb-1">Device Candidates</div>
             <div className="text-3xl font-bold text-red-600">{dashboard.summary.deviceCandidates.toLocaleString()}</div>
             <div className="text-xs text-red-600 mt-1">Eligible, not yet implanted</div>
           </div>
         </>
       ) : (
         <div className="col-span-4 p-6 text-center text-titanium-500 text-sm">
           No Heart Failure patients in this hospital yet.
         </div>
       )}
     </div>
   </div>
 </div>

 {/* Clinical Gap Intelligence — derived from real gap breakdown */}
 {dashboard && (
   <GapIntelligenceCard data={{
     totalGaps: Object.keys(dashboard.summary.gapsByType).length,
     categories: [
       { name: 'Medication', patients: dashboard.summary.gapsByType['MEDICATION_MISSING'] ?? 0, color: '#2C4A60' },
       { name: 'Safety', patients: dashboard.summary.gapsByType['SAFETY_ALERT'] ?? 0, color: '#9B2438' },
       { name: 'Monitoring', patients: dashboard.summary.gapsByType['MONITORING_OVERDUE'] ?? 0, color: '#4A6880' },
       { name: 'Follow-up', patients: dashboard.summary.gapsByType['FOLLOWUP_OVERDUE'] ?? 0, color: '#C8D4DC' },
     ],
     topGaps: Object.entries(dashboard.summary.gapsByType)
       .sort((a, b) => b[1] - a[1])
       .slice(0, 5)
       .map(([name, patients]) => ({ name: name.replace(/_/g, ' '), patients, opportunity: '—' })),
     safetyAlert: `${dashboard.summary.totalOpenGaps} open gaps across ${dashboard.summary.totalPatients} patients`,
   }} />
 )}

 {/* Gap Response Rate — care team action tracking */}
 <GapResponseRateCard
   rates={[]}
   overallRate={0}
   timeRange="30d"
 />

 {/* Forward-Looking Executive Cards */}
 <RevenuePipelineCard data={{
   quarters: [
     { quarter: 'Q1 2026', revenue: 2800000, procedures: 23, confidence: 'high' },
     { quarter: 'Q2 2026', revenue: 2100000, procedures: 18, confidence: 'moderate' },
     { quarter: 'Q3 2026', revenue: 1600000, procedures: 14, confidence: 'moderate' },
     { quarter: 'Q4 2026', revenue: 1200000, procedures: 10, confidence: 'low' },
   ],
   totalProjected12Month: 7700000,
 }} />
 <RevenueAtRiskCard data={{
   immediatePatients: 89,
   immediateRevenue: 4200000,
   deferralRevenue: 2800000,
   cumulativeRisk12Month: 9100000,
   deferralCostPerMonth: 700000,
 }} />
 <TrajectoryTrendsCard data={{
   worseningRapidPct: 18,
   worseningRapidCount: 216,
   meanDeclineRate: '2.3 pts/month KCCQ',
   declineMetric: 'HF',
   thresholdIn30Days: 4,
   totalFlaggedPatients: 1200,
   keyInsights: [
     '89 ATTR-CM patients identified with 7-signal detection -- 23 with rapid cardiac biomarker trajectory',
     'KCCQ below 45 (hospitalization threshold) projected for 4 patients within 30 days',
     'CardioMEMS-eligible patients averaging 2.1 hospitalizations/year -- trajectory predicts 3.4/year without intervention',
   ],
 }} />

 {/* Predictive Metrics Banner */}
 <PredictiveMetricsBanner data={{
   thresholdIn90Days: 47,
   quarterlyActionableRevenue: 4200000,
   totalIdentifiedRevenue: 14000000,
   rapidDeteriorationCount: 216,
   avgTimeToEvent: 8,
   projectedRevenueCurrentRate: 5200000,
   projectedRevenueSystematic: 11200000,
 }} />

 {/* #2: Revenue Opportunity Waterfall */}
 <div className="metal-card relative z-10 mb-6">
 <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
 <h3 className="text-xl font-bold text-titanium-900 mb-1">Revenue Opportunity Waterfall</h3>
 <p className="text-sm text-titanium-600">Annual revenue opportunity by intervention category</p>
 </div>
 <div className="p-6">
 <ROIWaterfall 
 data={{
 gdmt_revenue: 2.4,
 devices_revenue: 1.8,
 phenotypes_revenue: 1.2,
 _340b_revenue: 0.8,
 total_revenue: 6.2,
 realized_revenue: 3.1
 }}
 onCategoryClick={setSelectedWaterfallCategory}
 />
 </div>
 </div>

 {/* #3 & #4: Projected vs Realized Revenue and Benchmarks */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 mb-6">
 {/* Projected vs Realized */}
 <div className="metal-card">
 <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
 <h3 className="text-lg font-semibold text-titanium-900 mb-1">Projected vs Realized Revenue</h3>
 <p className="text-sm text-titanium-600">Revenue tracking and variance analysis</p>
 </div>
 <div className="p-6">
 <ProjectedVsRealizedChart onMonthClick={handleMonthClick} />
 </div>
 </div>

 {/* Benchmarks Panel */}
 <div className="metal-card">
 <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
 <h3 className="text-lg font-semibold text-titanium-900 mb-1">Performance Benchmarks</h3>
 <p className="text-sm text-titanium-600">Industry comparisons and targets</p>
 </div>
 <div className="p-6">
 <BenchmarksPanel onBenchmarkClick={handleBenchmarkClick} />
 </div>
 </div>
 </div>

 {/* #5: Revenue by Facility */}
 <div className="metal-card relative z-10 mb-6">
 <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
 <h3 className="text-lg font-semibold text-titanium-900 mb-1">Revenue by Facility</h3>
 <p className="text-sm text-titanium-600">Facility-level performance and opportunities</p>
 </div>
 <div className="p-6">
 <OpportunityHeatmap 
 data={[
 { site_id: 'Main Campus - HF Clinic', opp_revenue: 2100000, rank: 1 },
 { site_id: 'West Campus - HF Center', opp_revenue: 1800000, rank: 2 },
 { site_id: 'North Campus - HF Clinic', opp_revenue: 1600000, rank: 3 },
 { site_id: 'Community Medical Center - HF Unit', opp_revenue: 700000, rank: 4 }
 ]}
 onFacilityClick={handleFacilityClick}
 />
 </div>
 </div>

 {/* #6: Geographic Heat Map */}
 <div className="mb-6">
 <ZipHeatMap
 title="HF Decompensation Risk & Readmission Hotspots"
 data={heartFailureZipData}
 onZipClick={handleZipClick}
 centerLat={40.7589}
 centerLng={-73.9851}
 zoom={12}
 />
 </div>

 {/* #7: Revenue Opportunities Pipeline - Executive Summary */}
 <div className="mb-6">
 <div 
 onClick={() => setShowOpportunityModal(true)}
 className="bg-gradient-to-br from-[#f0f4f8] to-[#e8eef3] rounded-lg border-2 border-titanium-300 p-8 cursor-pointer hover:shadow-lg transition-shadow"
 >
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center mb-3">
 <TrendingUp className="w-6 h-6 text-teal-700 mr-2" />
 <h3 className="text-xl font-bold">Revenue Opportunities Pipeline</h3>
 </div>
 <div className="text-5xl font-bold text-teal-700 mb-2">$127,240</div>
 <div className="text-gray-600 text-lg mb-4">23 high-priority documentation opportunities identified</div>
 
 <div className="grid grid-cols-3 gap-4 mt-4">
 <div className="rounded-lg p-3 border" style={{ background: '#FDF2F3', borderColor: '#F5C0C8' }}>
 <div className="text-sm text-gray-600">High Priority</div>
 <div className="text-2xl font-bold" style={{ color: '#9B2438' }}>8</div>
 <div className="text-sm" style={{ color: '#8B6914' }}>$68,600</div>
 </div>
 <div className="rounded-lg p-3 border" style={{ background: '#FAF6E8', borderColor: '#D4B85C' }}>
 <div className="text-sm text-gray-600">Medium Priority</div>
 <div className="text-2xl font-bold" style={{ color: '#8B6914' }}>12</div>
 <div className="text-sm" style={{ color: '#8B6914' }}>$50,240</div>
 </div>
 <div className="rounded-lg p-3 border" style={{ background: '#F0F5FA', borderColor: '#C8D4DC' }}>
 <div className="text-sm text-gray-600">Due This Week</div>
 <div className="text-2xl font-bold" style={{ color: '#4A6880' }}>8</div>
 <div className="text-sm text-gray-500">Urgent action</div>
 </div>
 </div>
 </div>
 
 <div className="ml-6">
 <button className="px-6 py-3 bg-chrome-600 text-white rounded-lg hover:bg-chrome-700 font-semibold flex items-center">
 View Pipeline Details
 <ChevronRight className="w-5 h-5 ml-2" />
 </button>
 </div>
 </div>
 </div>
 </div>

 <div className="metal-card relative z-10 mb-6">
 <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
 <h3 className="text-lg font-semibold text-titanium-900 mb-2">{heartFailureConfig.drgTitle}</h3>
 <p className="text-sm text-titanium-600">{heartFailureConfig.drgDescription}</p>
 </div>
 
 <div className="p-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
 {heartFailureConfig.drgPerformanceCards.map((card, index) => {
 // DRG 291 (MCC, highest) → Metallic Gold; DRG 292 (CC, mid) → Chrome Blue mid; DRG 293 (lowest) → Carmona Red
 const drgColors = [
 { value: '#C4982A', bg: '#FAF6E8', border: '#D4B85C' },
 { value: '#4A6880', bg: '#F0F5FA', border: '#C8D4DC' },
 { value: '#9B2438', bg: '#FDF2F3', border: '#F5C0C8' },
 ];
 const dc = drgColors[index] || drgColors[0];
 return (
 <div
 key={card.title}
 className="rounded-xl p-4 border shadow-lg transition-all duration-300"
 style={{ background: `linear-gradient(to right, white, ${dc.bg})`, borderColor: dc.border }}
 >
 <div className="flex items-center gap-3 mb-3">
 <DollarSign className="w-8 h-8" style={{ color: dc.value }} />
 <div>
 <div className="font-semibold text-neutral-800">{card.title}</div>
 <div className="text-2xl font-bold" style={{ color: dc.value }}>{card.value}</div>
 </div>
 </div>
 <div className="text-sm text-teal-500 mb-2">
 {card.caseCount}
 </div>
 <div className={`text-sm ${card.isPositive ? 'text-teal-700' : 'text-medical-red-600'}`}>
 {card.variance}
 </div>
 </div>
 );
 })}
 </div>

 {/* Case Mix Index Performance */}
 <div className="bg-white rounded-xl p-4 border border-titanium-200 shadow-lg">
 <h4 className="font-semibold text-titanium-900 mb-4">{heartFailureConfig.moduleName} Case Mix Index (CMI) Analysis</h4>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="text-center">
 {/* Current CMI → Chrome Blue */}
 <div className="text-2xl font-bold" style={{ color: '#2C4A60' }}>{heartFailureConfig.drgMetrics.currentCMI}</div>
 <div className="text-sm text-titanium-600">Current CMI</div>
 <div className="text-xs text-teal-700">+0.28 vs target</div>
 </div>
 <div className="text-center">
 {/* Monthly Opportunity → Metallic Gold */}
 <div className="text-2xl font-bold" style={{ color: '#8B6914' }}>{heartFailureConfig.drgMetrics.monthlyOpportunity}</div>
 <div className="text-sm text-titanium-600">Monthly Opportunity</div>
 <div className="text-xs text-titanium-500">From DRG optimization</div>
 </div>
 <div className="text-center">
 {/* Documentation Rate → Racing Green */}
 <div className="text-2xl font-bold" style={{ color: '#2D6147' }}>{heartFailureConfig.drgMetrics.documentationRate}</div>
 <div className="text-sm text-titanium-600">Documentation Rate</div>
 <div className="text-xs text-titanium-500">CC/MCC capture</div>
 </div>
 <div className="text-center">
 {/* Avg LOS → Steel Teal (efficiency metric) */}
 <div className="text-2xl font-bold" style={{ color: '#1A6878' }}>{heartFailureConfig.drgMetrics.avgLOS}</div>
 <div className="text-sm text-titanium-600">Avg LOS</div>
 <div className="text-xs text-teal-700">{heartFailureConfig.drgMetrics.losBenchmark}</div>
 </div>
 </div>
 </div>
 </div>
 </div>


 </div>

 {/* Revenue Waterfall Modal */}
 {selectedWaterfallCategory && (
 <HFRevenueWaterfallModal
 category={selectedWaterfallCategory}
 totalRevenue={getCategoryData(selectedWaterfallCategory).revenue}
 patientCount={getCategoryData(selectedWaterfallCategory).patientCount}
 onClose={() => setSelectedWaterfallCategory(null)}
 />
 )}

 {/* Month Detail Modal */}
 {selectedMonth && (
 <HFMonthDetailModal
 month={selectedMonth.month}
 projected={selectedMonth.projected}
 realized={selectedMonth.realized}
 breakdown={selectedMonth.breakdown}
 onClose={() => setSelectedMonth(null)}
 />
 )}

 {/* Benchmark Detail Modal */}
 {selectedBenchmark && (
 <HFBenchmarkDetailModal
 {...selectedBenchmark}
 onClose={() => setSelectedBenchmark(null)}
 />
 )}

 {/* Facility Detail Modal deferred to Sprint C — see handleFacilityClick */}

 {/* Revenue Opportunity Modal */}
 {showOpportunityModal && (
 <HFRevenueOpportunityModal
 opportunities={[
 { priority: 'High', revenueImpact: 8420, drgUpgrade: 'DRG 293 → 291', dueDate: '2025-11-15' },
 { priority: 'High', revenueImpact: 6180, drgUpgrade: 'DRG 292 → 291', dueDate: '2025-11-14' },
 { priority: 'High', revenueImpact: 7350, drgUpgrade: 'DRG 293 → 291', dueDate: '2025-11-13' },
 { priority: 'Medium', revenueImpact: 4750, drgUpgrade: 'DRG 293 → 292', dueDate: '2025-11-16' },
 { priority: 'Medium', revenueImpact: 3920, drgUpgrade: 'DRG 292 → 291', dueDate: '2025-11-17' },
 { priority: 'Medium', revenueImpact: 5280, drgUpgrade: 'DRG 293 → 292', dueDate: '2025-11-18' },
 { priority: 'High', revenueImpact: 9150, drgUpgrade: 'DRG 293 → 291', dueDate: '2025-11-19' },
 { priority: 'Medium', revenueImpact: 4410, drgUpgrade: 'DRG 294 → 292', dueDate: '2025-11-20' },
 { priority: 'Low', revenueImpact: 2890, drgUpgrade: 'DRG 294 → 293', dueDate: '2025-11-21' },
 { priority: 'High', revenueImpact: 6740, drgUpgrade: 'DRG 292 → 291', dueDate: '2025-11-22' },
 { priority: 'Medium', revenueImpact: 3560, drgUpgrade: 'DRG 293 → 292', dueDate: '2025-11-23' },
 { priority: 'Low', revenueImpact: 2150, drgUpgrade: 'DRG 294 → 293', dueDate: '2025-11-24' },
 { priority: 'High', revenueImpact: 8890, drgUpgrade: 'DRG 293 → 291', dueDate: '2025-11-25' },
 { priority: 'Medium', revenueImpact: 4980, drgUpgrade: 'DRG 292 → 291', dueDate: '2025-11-26' },
 { priority: 'Low', revenueImpact: 3210, drgUpgrade: 'DRG 294 → 293', dueDate: '2025-11-27' },
 { priority: 'High', revenueImpact: 7620, drgUpgrade: 'DRG 293 → 291', dueDate: '2025-11-28' },
 { priority: 'Medium', revenueImpact: 4100, drgUpgrade: 'DRG 294 → 292', dueDate: '2025-11-29' },
 { priority: 'Low', revenueImpact: 2750, drgUpgrade: 'DRG 294 → 293', dueDate: '2025-11-30' },
 { priority: 'High', revenueImpact: 8320, drgUpgrade: 'DRG 292 → 291', dueDate: '2025-12-01' },
 { priority: 'Medium', revenueImpact: 3840, drgUpgrade: 'DRG 293 → 292', dueDate: '2025-12-02' },
 { priority: 'Low', revenueImpact: 2980, drgUpgrade: 'DRG 294 → 293', dueDate: '2025-12-03' },
 { priority: 'High', revenueImpact: 9480, drgUpgrade: 'DRG 293 → 291', dueDate: '2025-12-04' },
 { priority: 'Medium', revenueImpact: 4650, drgUpgrade: 'DRG 292 → 291', dueDate: '2025-12-05' }
 ]}
 onClose={() => setShowOpportunityModal(false)}
 onViewDetails={() => {
 // Navigate to Service Line view
 setShowOpportunityModal(false);
 }}
 />
 )}


 {/* ZIP Detail Modal */}
 {selectedZip && (() => {
 const zipInfo = heartFailureZipData.find(z => z.zipCode === selectedZip);
 return (
 <BaseDetailModal
 title={`ZIP Code ${selectedZip}`}
 subtitle="HF Decompensation Risk Patient Summary"
 icon={<Heart className="w-6 h-6" />}
 summaryMetrics={[
 { label: 'Patients', value: zipInfo?.patientCount?.toString() || '0', colorScheme: 'porsche' },
 { label: 'Risk Score', value: zipInfo?.riskScore != null ? toFixed(zipInfo.riskScore, 1) : '—', colorScheme: zipInfo && zipInfo.riskScore >= 7 ? 'crimson' : 'amber' },
 { label: 'Risk Level', value: zipInfo?.riskLevel || 'N/A' },
 { label: 'Condition', value: 'HF Decompensation' },
 ]}
 onClose={() => setSelectedZip(null)}
 />
 );
 })()}

 {/* DRG Detail Modal deferred to Sprint C — cases must come from billing data */}
 </div>
  );
};

export default ExecutiveView;