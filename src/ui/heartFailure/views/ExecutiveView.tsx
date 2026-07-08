import React, { useEffect, useState } from 'react';
import { DollarSign, Users, TrendingUp, Target, ChevronRight, Zap, Info, Search } from 'lucide-react';
import { getHeartFailureDashboard, HFDashboardData } from '../../../services/api';
import { heartFailureConfig } from '../config/executiveConfig';
import ExportButton from '../../../components/shared/ExportButton';
import ZipHeatMap from '../../../components/shared/ZipHeatMap';
import ROIWaterfall from '../components/ROIWaterfall';
import BenchmarksPanel from '../components/BenchmarksPanel';
import ProjectedVsRealizedChart from '../components/ProjectedVsRealizedChart';
import OpportunityHeatmap from '../components/OpportunityHeatmap';
import { ExportData } from '../../../utils/dataExport';
import { toFixed } from '../../../utils/formatters';
import { HFExecutiveSummary } from '../../../components/heartFailure/HFExecutiveSummary';
import GapIntelligenceSection from '../components/executive/GapIntelligenceSection';
import GapResponseRateCard from '../../../components/shared/GapResponseRateCard';
import PredictiveMetricsBanner from '../../../components/shared/PredictiveMetricsBanner';
import { RevenuePipelineCard, RevenueAtRiskCard, TrajectoryTrendsCard } from '../../../components/shared/ForwardLookingCards';
import type { RevenuePipelineData, RevenueAtRiskData, TrajectoryTrendsData } from '../../../components/shared/ForwardLookingCards';
import { HFRevenueWaterfallModal } from '../../../components/heartFailure/HFRevenueWaterfallModal';
import HFMonthDetailModal from '../../../components/heartFailure/HFMonthDetailModal';
import HFBenchmarkDetailModal from '../../../components/heartFailure/HFBenchmarkDetailModal';
import HFRevenueOpportunityModal from '../../../components/heartFailure/HFRevenueOpportunityModal';
import BaseDetailModal from '../../../components/shared/BaseDetailModal';
import DemoDataBadge from '../../../components/shared/DemoDataBadge';
import {
  HF_DEMO_ANNUAL_OPPORTUNITY_M,
  HF_DEMO_WATERFALL,
  HF_DEMO_CATEGORY_DETAIL,
  HF_DEMO_PIPELINE,
  HF_DEMO_AT_RISK,
  HF_DEMO_PREDICTIVE,
  HF_DEMO_FACILITIES,
  HF_DEMO_DOC_OPPORTUNITIES,
  HF_DEMO_DOC_PIPELINE_SUMMARY,
  formatDemoDollars,
} from '../config/hfDemoFinancials';
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

  // Get category-specific revenue and patient data (single demo model - hfDemoFinancials)
  const getCategoryData = (category: string) => {
    return HF_DEMO_CATEGORY_DETAIL[category] || { revenue: 0, patientCount: 0 };
  };

  // Month drill-down breakdown: split the clicked month's projected/realized by the
  // SAME category shares as the annual waterfall (GDMT/Devices/Phenotypes/340B); the
  // last category absorbs rounding so the breakdown sums exactly to the month.
  const generateMonthBreakdown = (month: string, projected: number, realized: number) => {
    const cats = [
      { category: 'GDMT', share: HF_DEMO_WATERFALL.gdmt_revenue },
      { category: 'Devices', share: HF_DEMO_WATERFALL.devices_revenue },
      { category: 'Phenotypes', share: HF_DEMO_WATERFALL.phenotypes_revenue },
      { category: '340B', share: HF_DEMO_WATERFALL._340b_revenue },
    ];
    const total = HF_DEMO_WATERFALL.total_revenue;
    let projAlloc = 0;
    let realAlloc = 0;
    return cats.map((c, i) => {
      if (i === cats.length - 1) {
        return { category: c.category, projected: projected - projAlloc, realized: realized - realAlloc };
      }
      const p = Math.round((projected * c.share) / total);
      const r = Math.round((realized * c.share) / total);
      projAlloc += p;
      realAlloc += r;
      return { category: c.category, projected: p, realized: r };
    });
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

  // Facility drill-down intentionally NOT wired: no facility-level detail exists in
  // the demo model or the dashboard contract, so the card renders without a click
  // affordance (OpportunityHeatmap only shows cursor/hover when a handler is passed).

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

  // Generate export data - rows agree with the on-screen values: live rows read the
  // dashboard fetch; demo rows read the single hfDemoFinancials model; fabricated
  // targets/variances with no source are exported as '-' (HF Exec batch 1).
  const generateExportData = (): ExportData => {
 const s = dashboard?.summary;
 const gdmtRate = s && s.totalPatients > 0 ? `${Math.round((s.gdmtOptimized / s.totalPatients) * 100)}%` : 'pending';
 return {
 filename: 'heart-failure-executive-report',
 title: 'Heart Failure Executive Dashboard',
 headers: ['Metric', 'Value', 'Target', 'Variance'],
 rows: [
 ['Total Revenue Opportunity (demo model)', `$${HF_DEMO_ANNUAL_OPPORTUNITY_M.toFixed(1)}M`, '-', '-'],
 ['Patient Population (live)', s ? s.totalPatients.toLocaleString() : 'pending', '-', '-'],
 ['GDMT Optimized - no open med gaps (live)', gdmtRate, '-', '-'],
 ['Open Therapy Gaps (live)', s ? s.totalOpenGaps.toLocaleString() : 'pending', '-', '-'],
 ['Current CMI (demo)', heartFailureConfig.drgMetrics.currentCMI, '2.30', '-0.02'],
 ['Documentation Rate (demo)', heartFailureConfig.drgMetrics.documentationRate, '95%', '-3.8%'],
 ['Average LOS (demo)', heartFailureConfig.drgMetrics.avgLOS, '3.5 days', '-0.3 days'],
 ],
 metadata: {
 reportDate: new Date().toISOString(),
 module: 'Heart Failure',
 dataSource: 'TAILRD Analytics Platform (live gap data + labeled demo financial model)',
 lastUpdated: new Date().toISOString()
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

 {/* #1: Enhanced Interactive Executive Summary - shares the single dashboard fetch (no duplicate request) */}
 <HFExecutiveSummary dashboard={dashboard} loading={dashboardLoading} error={dashboardError} />

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
         <span className="text-xs text-blue-700 font-medium">Demo data &middot; EHR integration pending</span>
       </div>
     </div>
   </div>
   <div className="p-6">
     {/* Patient-total tile removed: the summary row above is now the tier's single
         live patient-total card (no duplicate-label conflict). */}
     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
       {dashboardLoading ? (
         <div className="col-span-3 animate-pulse h-24 bg-titanium-100 rounded-xl" />
       ) : dashboardError ? (
         <div className="col-span-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
           Failed to load Heart Failure metrics: {dashboardError}
         </div>
       ) : dashboard && dashboard.summary.totalPatients > 0 ? (
         <>
           <div className="bg-white rounded-xl p-4 border border-titanium-200 shadow-sm">
             <div className="text-sm text-titanium-600 mb-1">Open Therapy Gaps</div>
             <div className="text-3xl font-bold text-red-600">{dashboard.summary.totalOpenGaps.toLocaleString()}</div>
             <div className="text-xs text-red-500 mt-1">Recommended for review</div>
           </div>
           <div className="bg-white rounded-xl p-4 border border-titanium-200 shadow-sm">
             <div className="text-sm text-titanium-600 mb-1">GDMT Optimized</div>
             <div className="text-3xl font-bold text-teal-700">{dashboard.summary.gdmtOptimized.toLocaleString()}</div>
             <div className="text-xs text-teal-500 mt-1">No unresolved medication gaps</div>
           </div>
           <div className="bg-white rounded-xl p-4 border border-titanium-200 shadow-sm">
             <div className="text-sm text-titanium-600 mb-1">Device Candidates</div>
             <div className="text-3xl font-bold text-red-600">{dashboard.summary.deviceCandidates.toLocaleString()}</div>
             <div className="text-xs text-red-600 mt-1">Eligible, not yet implanted</div>
           </div>
         </>
       ) : (
         <div className="col-span-3 p-6 text-center text-titanium-500 text-sm">
           No Heart Failure patients in this hospital yet.
         </div>
       )}
     </div>
   </div>
 </div>

 {/* Clinical Gap Intelligence - live open-gap count + per-type breakdown, with an
     honest frame when offline/loading (GapIntelligenceSection; batch 1 addendum 2). */}
 <GapIntelligenceSection dashboard={dashboard} loading={dashboardLoading} error={dashboardError} />

 {/* Gap Response Rate — care team action tracking */}
 <GapResponseRateCard
   rates={[]}
   overallRate={0}
   timeRange="30d"
 />

 {/* Forward-Looking Executive Cards - single demo model (hfDemoFinancials), demo-labeled */}
 <RevenuePipelineCard data={HF_DEMO_PIPELINE} demoData />
 <RevenueAtRiskCard data={HF_DEMO_AT_RISK} demoData cleanSurface immediateNote="= the YTD projected-realized gap" />
 <TrajectoryTrendsCard demoData cleanSurface data={{
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

 {/* Predictive Metrics Banner - dollars reconciled to the single demo model */}
 <PredictiveMetricsBanner demoData cleanSurface data={{
   thresholdIn90Days: 47,
   quarterlyActionableRevenue: HF_DEMO_PREDICTIVE.quarterlyActionableRevenue,
   totalIdentifiedRevenue: HF_DEMO_PREDICTIVE.totalIdentifiedRevenue,
   rapidDeteriorationCount: 216,
   avgTimeToEvent: 8,
   projectedRevenueCurrentRate: HF_DEMO_PREDICTIVE.projectedRevenueCurrentRate,
   projectedRevenueSystematic: HF_DEMO_PREDICTIVE.projectedRevenueSystematic,
 }} />

 {/* #2: Revenue Opportunity Waterfall */}
 <div className="metal-card relative z-10 mb-6">
 <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-xl font-bold text-titanium-900 mb-1">Revenue Opportunity Waterfall</h3>
 <p className="text-sm text-titanium-600">Annual revenue opportunity by intervention category</p>
 </div>
 <DemoDataBadge />
 </div>
 </div>
 <div className="p-6">
 <ROIWaterfall
 data={HF_DEMO_WATERFALL}
 onCategoryClick={setSelectedWaterfallCategory}
 />
 </div>
 </div>

 {/* #3 & #4: Projected vs Realized Revenue and Benchmarks */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 mb-6">
 {/* Projected vs Realized */}
 <div className="metal-card">
 <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold text-titanium-900 mb-1">Projected vs Realized Revenue</h3>
 <p className="text-sm text-titanium-600">Revenue tracking and variance analysis</p>
 </div>
 <DemoDataBadge />
 </div>
 </div>
 <div className="p-6">
 <ProjectedVsRealizedChart onMonthClick={handleMonthClick} />
 </div>
 </div>

 {/* Benchmarks Panel - the national-comparison/percentile layer has no data source yet */}
 <div className="metal-card">
 <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold text-titanium-900 mb-1">Performance Benchmarks</h3>
 <p className="text-sm text-titanium-600">Industry comparisons and targets</p>
 </div>
 <DemoDataBadge label="Demo benchmarks - national comparison pending" />
 </div>
 </div>
 <div className="p-6">
 <BenchmarksPanel onBenchmarkClick={handleBenchmarkClick} />
 </div>
 </div>
 </div>

 {/* #5: Revenue by Facility - facility decomposition of the same demo total */}
 <div className="metal-card relative z-10 mb-6">
 <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold text-titanium-900 mb-1">Revenue by Facility</h3>
 <p className="text-sm text-titanium-600">Facility-level performance and opportunities</p>
 </div>
 <DemoDataBadge />
 </div>
 </div>
 <div className="p-6">
 <OpportunityHeatmap
 data={HF_DEMO_FACILITIES}
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
 className="bg-white rounded-lg border-2 border-titanium-300 p-8 cursor-pointer hover:shadow-lg transition-shadow"
 >
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center mb-3">
 <TrendingUp className="w-6 h-6 text-teal-700 mr-2" />
 <h3 className="text-xl font-bold mr-3">Revenue Opportunities Pipeline</h3>
 <DemoDataBadge label="Demo data - DRG billing source pending" />
 </div>
 {/* Headline + sub-cards DERIVED from the same 23-row demo set - arithmetic cannot diverge
     (was: a hand-typed headline disagreeing with its own sub-cards in both dollars and count). */}
 <div className="text-5xl font-bold text-teal-700 mb-2">{formatDemoDollars(HF_DEMO_DOC_PIPELINE_SUMMARY.totalDollars)}</div>
 <div className="text-gray-600 text-lg mb-4">{HF_DEMO_DOC_PIPELINE_SUMMARY.count} documentation opportunities identified</div>

 {/* White-card treatment (batch 2): white sub-card surfaces, titanium borders,
     the priority signal carried by the solid count/value accents only. */}
 <div className="grid grid-cols-3 gap-4 mt-4">
 <div className="rounded-lg p-3 border bg-white border-titanium-200">
 <div className="text-sm text-gray-600">High Priority</div>
 <div className="text-2xl font-bold" style={{ color: '#9B2438' }}>{HF_DEMO_DOC_PIPELINE_SUMMARY.high.count}</div>
 <div className="text-sm" style={{ color: '#8B6914' }}>{formatDemoDollars(HF_DEMO_DOC_PIPELINE_SUMMARY.high.dollars)}</div>
 </div>
 <div className="rounded-lg p-3 border bg-white border-titanium-200">
 <div className="text-sm text-gray-600">Medium Priority</div>
 <div className="text-2xl font-bold" style={{ color: '#8B6914' }}>{HF_DEMO_DOC_PIPELINE_SUMMARY.medium.count}</div>
 <div className="text-sm" style={{ color: '#8B6914' }}>{formatDemoDollars(HF_DEMO_DOC_PIPELINE_SUMMARY.medium.dollars)}</div>
 </div>
 <div className="rounded-lg p-3 border bg-white border-titanium-200">
 <div className="text-sm text-gray-600">Low Priority</div>
 <div className="text-2xl font-bold" style={{ color: '#4A6880' }}>{HF_DEMO_DOC_PIPELINE_SUMMARY.low.count}</div>
 <div className="text-sm text-gray-500">{formatDemoDollars(HF_DEMO_DOC_PIPELINE_SUMMARY.low.dollars)}</div>
 </div>
 </div>
 </div>
 
 <div className="ml-6">
 {/* Explicit handler (batch 2): previously relied on event-bubble to the parent card;
     same idempotent action, so bubbling stays harmless. */}
 <button
 type="button"
 onClick={() => setShowOpportunityModal(true)}
 className="px-6 py-3 bg-chrome-600 text-white rounded-lg hover:bg-chrome-700 font-semibold flex items-center"
 >
 View Pipeline Details
 <ChevronRight className="w-5 h-5 ml-2" />
 </button>
 </div>
 </div>
 </div>
 </div>

 <div className="metal-card relative z-10 mb-6">
 <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold text-titanium-900 mb-2">{heartFailureConfig.drgTitle}</h3>
 <p className="text-sm text-titanium-600">{heartFailureConfig.drgDescription}</p>
 </div>
 <DemoDataBadge label="Demo data - DRG billing source pending" />
 </div>
 </div>
 
 <div className="p-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
 {heartFailureConfig.drgPerformanceCards.map((card, index) => {
 // White-card treatment (batch 2): the DRG tier signal is carried by the solid
 // accent on the $ icon + value only (DRG 291 gold, 292 chrome-deep, 293 carmine).
 // Cards are display-only by design: case-level drill-down needs a real DRG
 // billing source (no click affordance is rendered).
 const drgColors = [
 { value: '#C4982A' },
 { value: '#4A6880' },
 { value: '#9B2438' },
 ];
 const dc = drgColors[index] || drgColors[0];
 return (
 <div
 key={card.title}
 className="rounded-xl p-4 border shadow-lg transition-all duration-300 bg-white border-titanium-200"
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
 {/* Current CMI -> Chrome Blue. Variance corrected: 2.28 vs the 2.30 target = -0.02
     (was a self-contradictory hardcoded positive variance beside the -0.02 export row). */}
 <div className="text-2xl font-bold" style={{ color: '#2C4A60' }}>{heartFailureConfig.drgMetrics.currentCMI}</div>
 <div className="text-sm text-titanium-600">Current CMI</div>
 <div className="text-xs text-titanium-500">-0.02 vs 2.30 target</div>
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

 {/* Revenue Opportunity Modal. The view-details prop is intentionally NOT passed: its
     button claimed Service-Line navigation the tier cannot do (tabs are in-page state,
     no deep-link) - omitting the prop removes the dead control. */}
 {showOpportunityModal && (
 <HFRevenueOpportunityModal
 opportunities={HF_DEMO_DOC_OPPORTUNITIES}
 onClose={() => setShowOpportunityModal(false)}
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