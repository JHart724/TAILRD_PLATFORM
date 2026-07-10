import React, { useState } from 'react';
import { useModuleDashboard } from '../../../hooks/useModuleDashboard';
import { DollarSign, Users, TrendingUp, Target, ChevronRight, Zap, Search } from 'lucide-react';
import ExportButton from '../../../components/shared/ExportButton';
import ZipHeatMap from '../../../components/shared/ZipHeatMap';
import { ExportData } from '../../../utils/dataExport';
import EPROIWaterfall from '../components/EPROIWaterfall';
import EPBenchmarksPanel from '../components/BenchmarksPanel';
import EPProjectedVsRealizedChart from '../components/EPProjectedVsRealizedChart';
import EPExecutiveSummary, { EPDashboardData } from '../components/EPExecutiveSummary';
import EPForwardOutlookPanel from '../components/EPForwardOutlookPanel';
import EPRevenueWaterfallModal from '../components/EPRevenueWaterfallModal';
import EPMonthDetailModal from '../components/EPMonthDetailModal';
import EPBenchmarkDetailModal from '../../../components/electrophysiology/EPBenchmarkDetailModal';
import EPFacilityDetailModal from '../components/EPFacilityDetailModal';
import EPRevenueOpportunityModal from '../components/EPRevenueOpportunityModal';
import EPDRGDetailModal from '../components/EPDRGDetailModal';
import { modulesClinicalData } from '../../../config/allModulesClinicalData';
import { getOrdinalSuffix, formatMillions, toFixed, roundTo } from '../../../utils/formatters';
import BaseDetailModal from '../../../components/shared/BaseDetailModal';
import GapIntelligenceCard from '../../../components/shared/GapIntelligenceCard';
import DemoDataBadge from '../../../components/shared/DemoDataBadge';
import {
  EP_DEMO_WATERFALL,
  EP_DEMO_CATEGORY_DETAIL,
  EP_DEMO_CATEGORIES,
  EP_DEMO_TOPGAPS,
  EP_DEMO_SAFETY_ALERT,
} from '../config/epDemoFinancials';
import { Heart } from 'lucide-react';

// Get electrophysiology data
const electrophysiologyData = modulesClinicalData.electrophysiology;

const ElectrophysiologyExecutiveView: React.FC = () => {
  // useModuleDashboard returns `data: any`; the EP dashboard endpoint emits the
  // EPDashboardData contract (patient/gap/device counts), so type it here to drop `any`.
  const { data: dashboardRaw, loading: dashboardLoading, error: dashboardError } = useModuleDashboard('electrophysiology');
  const dashboard = (dashboardRaw as EPDashboardData | null) ?? null;
  const [selectedWaterfallCategory, setSelectedWaterfallCategory] = useState<'Ablation Therapy' | 'Devices' | 'Phenotypes' | '340B' | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<any>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<any>(null);
  const [selectedFacility, setSelectedFacility] = useState<any>(null);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [selectedDRG, setSelectedDRG] = useState<any>(null);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);

  // Category revenue + patient detail for the waterfall drill-down modal - a stated
  // decomposition of the single epDemoFinancials model (was: bespoke fallback literals
  // that disagreed with the waterfall totals).
  const getCategoryData = (category: 'Ablation Therapy' | 'Devices' | 'Phenotypes' | '340B') => {
	const key = category === 'Ablation Therapy' ? 'Ablation' : category;
	return EP_DEMO_CATEGORY_DETAIL[key] || { revenue: 0, patientCount: 0 };
  };

  const getFacilityData = (facilityName: string) => {
	return electrophysiologyData.facilities?.find(f => f.name.includes(facilityName));
  };

  const getBenchmarkData = (metric: string) => {
	// Try to get from electrophysiology data first
	if (electrophysiologyData.benchmarks && Array.isArray(electrophysiologyData.benchmarks)) {
	const found = electrophysiologyData.benchmarks.find(b => b.metric === metric);
	if (found) return found;
	}
	// Fallback electrophysiology benchmarks
	const fallbackBenchmarks = [
	{ metric: 'Ablation 30-Day Mortality', value: 1.8, benchmark: 2.5, percentile: 87, trend: 'down', description: '30-day mortality post-Ablation' },
	{ metric: 'LAAC Technical Success', value: 96, benchmark: 92, percentile: 83, trend: 'up', description: 'MR reduction to ≤2+' },
	{ metric: 'Heart Team Utilization', value: 98, benchmark: 85, percentile: 94, trend: 'up', description: 'Cases reviewed by heart team' }
	];
	return fallbackBenchmarks.find(b => b.metric === metric);
  };

  const getDRGData = (code: string) => {
	// Use electrophysiology data DRGs, fallback to hardcoded data
	const drgs = electrophysiologyData.drgs || [
	{ code: '266', name: 'Ablation w MCC', caseCount: 45, avgReimbursement: 54320, margin: 46.8 },
	{ code: '267', name: 'Ablation w CC', caseCount: 67, avgReimbursement: 45680, margin: 47.2 },
	{ code: '269', name: 'LAAC w MCC', caseCount: 32, avgReimbursement: 42340, margin: 47.8 }
	];
	return drgs.find(d => d.code === code);
  };

  // Build the EPDRGDetailModal's expected shape from a DRG card object. The card data
  // (electrophysiologyData.drgs) carries `cases` as a numeric COUNT, but the modal
  // expects `cases` to be a Case[] array - passing the number crashed the modal with
  // "cases is not iterable" (`[...cases]`). This maps the card fields to the modal
  // contract and synthesizes a well-formed demo case list so the drill-down (kept
  // as an intentional affordance, DemoDataBadge'd) renders instead of throwing.
  const getEPDRGDetailData = (code: string) => {
	const drg: any = getDRGData(code);
	if (!drg) return null;
	const volume = drg.cases ?? drg.caseCount ?? 0;
	const avgReimbursement = drg.reimbursement ?? drg.avgReimbursement ?? 0;
	const marginPct = drg.margin ?? 0;
	const avgCost = drg.cost ?? Math.round(avgReimbursement * (1 - marginPct / 100));
	// Deterministic (no Math.random) de-identified demo cases; fixed variation factors
	// keep the list reproducible. No per-case billing source exists, so this is demo
	// detail behind the modal's DemoDataBadge.
	const ageRanges = ['55-64', '65-74', '75-84', '65-74', '55-64', '75-84', '85+', '65-74', '55-64', '75-84'];
	const losFactors = [0.8, 1.0, 1.2, 0.9, 1.1, 1.3, 0.7, 1.0, 1.15, 0.95];
	const costFactors = [0.92, 1.0, 1.08, 0.95, 1.05, 1.12, 0.88, 1.0, 1.06, 0.97];
	const revFactors = [1.05, 1.0, 0.96, 1.02, 0.98, 0.94, 1.08, 1.0, 0.97, 1.03];
	const baseLos = 2.8;
	const cases = ageRanges.map((ageRange, i) => {
	const cost = Math.round(avgCost * costFactors[i]);
	const revenue = Math.round(avgReimbursement * revFactors[i]);
	const caseMargin = revenue - cost;
	const marginPercent = revenue ? (caseMargin / revenue) * 100 : 0;
	return {
	caseId: `EP-${drg.code}-${String(i + 1).padStart(2, '0')}`,
	ageRange,
	los: Math.round(baseLos * losFactors[i] * 10) / 10,
	cost,
	revenue,
	margin: caseMargin,
	marginPercent,
	};
	});
	return {
	drgCode: drg.code,
	description: drg.name ?? `DRG ${drg.code}`,
	volume,
	avgReimbursement,
	totalRevenue: avgReimbursement * volume,
	avgLos: baseLos,
	avgCost,
	margin: marginPct,
	targetLos: 3.0,
	hospitalAvgLos: 3.0,
	nationalBenchmarkLos: 3.2,
	cases,
	};
  };

  // Month drill-down breakdown: split the clicked month's projected/realized by the
  // SAME category shares as the annual waterfall (Ablation/Devices/Phenotypes/340B);
  // the last category absorbs rounding so the breakdown sums exactly to the month.
  const generateMonthBreakdown = (month: string, projected: number, realized: number) => {
	const cats = [
	{ category: 'Ablation', share: EP_DEMO_WATERFALL.ablation_revenue },
	{ category: 'Devices', share: EP_DEMO_WATERFALL.devices_revenue },
	{ category: 'Phenotypes', share: EP_DEMO_WATERFALL.phenotypes_revenue },
	{ category: '340B', share: EP_DEMO_WATERFALL._340b_revenue },
	];
	const total = EP_DEMO_WATERFALL.total_revenue;
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

  // Generate benchmark detail data for electrophysiology
  const getElectrophysiologyBenchmarkData = (metric: string) => {
	// First try to get from electrophysiology data
	const benchmarkData = getBenchmarkData(metric);
	if (benchmarkData) {
	return {
	benchmarkName: benchmarkData.metric,
	description: benchmarkData.description,
	ourValue: benchmarkData.value,
	nationalValue: benchmarkData.benchmark,
	percentile: benchmarkData.percentile,
	unit: metric.includes('Rate') || metric.includes('Success') ? '%' : '',
	comparisonData: {
	top10: benchmarkData.benchmark + 15,
	top25: benchmarkData.benchmark + 10,
	top50: benchmarkData.benchmark + 5,
	national: benchmarkData.benchmark
	}
	};
	}

	// Fallback electrophysiology specific benchmarks
	const benchmarkDetails: Record<string, any> = {
	'AF Ablation Success': {
	benchmarkName: 'AF Ablation Success',
	description: 'Freedom from AF recurrence at 12 months post-catheter ablation',
	ourValue: 95,
	nationalValue: 88,
	percentile: 82,
	unit: '%',
	trendData: [
	{ month: 'Jun', value: 91 }, { month: 'Jul', value: 92 }, { month: 'Aug', value: 93 },
	{ month: 'Sep', value: 94 }, { month: 'Oct', value: 94 }, { month: 'Nov', value: 95 }
	],
	comparisonData: { top10: 97, top25: 94, top50: 91, national: 88 }
	},
	'LAAC Device Success': {
	benchmarkName: 'LAAC Device Success',
	description: 'Successful left atrial appendage closure device implantation without major complications',
	ourValue: 97,
	nationalValue: 95,
	percentile: 88,
	unit: '%',
	trendData: [
	{ month: 'Jun', value: 95 }, { month: 'Jul', value: 95 }, { month: 'Aug', value: 96 },
	{ month: 'Sep', value: 96 }, { month: 'Oct', value: 97 }, { month: 'Nov', value: 97 }
	],
	comparisonData: { top10: 99, top25: 97, top50: 96, national: 95 }
	},
	'Pacemaker Complications': {
	benchmarkName: 'Pacemaker Complications',
	description: 'Rate of major complications within 30 days of pacemaker implantation (lower is better)',
	ourValue: 2.1,
	nationalValue: 3.2,
	percentile: 78,
	unit: '%',
	trendData: [
	{ month: 'Jun', value: 3.0 }, { month: 'Jul', value: 2.8 }, { month: 'Aug', value: 2.6 },
	{ month: 'Sep', value: 2.4 }, { month: 'Oct', value: 2.2 }, { month: 'Nov', value: 2.1 }
	],
	comparisonData: { top10: 1.2, top25: 1.8, top50: 2.5, national: 3.2 }
	},
	'ICD Appropriate Therapy': {
	benchmarkName: 'ICD Appropriate Therapy',
	description: 'Percentage of ICD patients receiving appropriate therapy for ventricular arrhythmias',
	ourValue: 18,
	nationalValue: 15,
	percentile: 72,
	unit: '%',
	trendData: [
	{ month: 'Jun', value: 14 }, { month: 'Jul', value: 15 }, { month: 'Aug', value: 16 },
	{ month: 'Sep', value: 17 }, { month: 'Oct', value: 17 }, { month: 'Nov', value: 18 }
	],
	comparisonData: { top10: 24, top25: 20, top50: 17, national: 15 }
	},
	'Lead Extraction Success': {
	benchmarkName: 'Lead Extraction Success',
	description: 'Successful transvenous lead extraction rate including complete and clinical success',
	ourValue: 96,
	nationalValue: 91,
	percentile: 85,
	unit: '%',
	trendData: [
	{ month: 'Jun', value: 92 }, { month: 'Jul', value: 93 }, { month: 'Aug', value: 94 },
	{ month: 'Sep', value: 95 }, { month: 'Oct', value: 95 }, { month: 'Nov', value: 96 }
	],
	comparisonData: { top10: 99, top25: 97, top50: 94, national: 91 }
	},
	'CRT Response Rate': {
	benchmarkName: 'CRT Response Rate',
	description: 'Percentage of CRT recipients demonstrating clinical response (LVEF improvement >=5% or NYHA class improvement)',
	ourValue: 78,
	nationalValue: 65,
	percentile: 89,
	unit: '%',
	trendData: [
	{ month: 'Jun', value: 70 }, { month: 'Jul', value: 72 }, { month: 'Aug', value: 74 },
	{ month: 'Sep', value: 75 }, { month: 'Oct', value: 77 }, { month: 'Nov', value: 78 }
	],
	comparisonData: { top10: 85, top25: 78, top50: 72, national: 65 }
	},
	'Ablation 30-Day Mortality': {
	benchmarkName: 'Ablation 30-Day Mortality',
	description: '30-day all-cause mortality post-Ablation',
	ourValue: 1.8,
	nationalValue: 2.5,
	percentile: 87,
	unit: '%',
	trendData: [
	{ month: 'Jun', value: 2.4 },
	{ month: 'Jul', value: 2.2 },
	{ month: 'Aug', value: 2.1 },
	{ month: 'Sep', value: 2.0 },
	{ month: 'Oct', value: 1.9 },
	{ month: 'Nov', value: 1.8 }
	],
	comparisonData: { top10: 1.2, top25: 1.5, top50: 2.0, national: 2.5 }
	},
	'LAAC Technical Success': {
	benchmarkName: 'LAAC Technical Success',
	description: 'MR reduction to <=2+ post-procedure',
	ourValue: 96,
	nationalValue: 92,
	percentile: 83,
	unit: '%',
	trendData: [
	{ month: 'Jun', value: 93 },
	{ month: 'Jul', value: 94 },
	{ month: 'Aug', value: 94 },
	{ month: 'Sep', value: 95 },
	{ month: 'Oct', value: 95 },
	{ month: 'Nov', value: 96 }
	],
	comparisonData: { top10: 98, top25: 96, top50: 94, national: 92 }
	}
	};
	return benchmarkDetails[metric] || null;
  };

  // Handle benchmark click
  const handleBenchmarkClick = (benchmarkMetric: string) => {
	const benchmarkData = getElectrophysiologyBenchmarkData(benchmarkMetric);
	if (benchmarkData) {
	setSelectedBenchmark(benchmarkData);
	}
  };

  // Generate facility detail data for electrophysiology
  const getElectrophysiologyFacilityData = (facilityName: string) => {
	// First try to get from electrophysiology data
	const facilityData = getFacilityData(facilityName);
	if (facilityData) {
	return {
	facilityName: facilityData.name,
	location: facilityData.location,
	totalRevenue: facilityData.totalRevenue,
	patientCount: facilityData.patientCount,
	gdmtRate: facilityData.gdmtRate,
	captureRate: facilityData.captureRate,
	breakdown: facilityData.breakdown,
	providers: facilityData.providers || []
	};
	}

	// Fallback facility data
	const facilities: Record<string, any> = {
	'Main Campus': {
	facilityName: 'Main Campus',
	location: '1000 Medical Center Dr, Suite 100',
	totalRevenue: 4200000,
	patientCount: 247,
	gdmtRate: 68,
	captureRate: 35,
	breakdown: [
	{ category: 'Ablation', revenue: 1800000 },
	{ category: 'LAAC', revenue: 1200000 },
	{ category: 'Pacing/ICD', revenue: 800000 },
	{ category: 'Monitoring', revenue: 400000 }
	],
	providers: [
	{ name: 'Dr. Sarah Chen', patients: 62, gdmtRate: 78, revenueImpact: 845000 },
	{ name: 'Dr. Michael Rodriguez', patients: 55, gdmtRate: 74, revenueImpact: 708000 },
	{ name: 'Dr. Jennifer Kim', patients: 48, gdmtRate: 71, revenueImpact: 589000 },
	{ name: 'Dr. David Thompson', patients: 44, gdmtRate: 65, revenueImpact: 465000 },
	{ name: 'Dr. Lisa Wang', patients: 38, gdmtRate: 62, revenueImpact: 348000 }
	]
	},
	'North Center': {
	facilityName: 'North Center',
	location: '2500 West Medical Blvd, Suite 200',
	totalRevenue: 2100000,
	patientCount: 156,
	gdmtRate: 72,
	captureRate: 42,
	breakdown: [
	{ category: 'Ablation', revenue: 900000 },
	{ category: 'LAAC', revenue: 600000 },
	{ category: 'Pacing/ICD', revenue: 400000 },
	{ category: 'Monitoring', revenue: 200000 }
	],
	providers: [
	{ name: 'Dr. James Wilson', patients: 42, gdmtRate: 82, revenueImpact: 498000 },
	{ name: 'Dr. Maria Gonzalez', patients: 38, gdmtRate: 79, revenueImpact: 385000 },
	{ name: 'Dr. Robert Lee', patients: 36, gdmtRate: 75, revenueImpact: 365000 },
	{ name: 'Dr. Amanda Foster', patients: 22, gdmtRate: 68, revenueImpact: 242000 },
	{ name: 'Dr. Kevin Park', patients: 18, gdmtRate: 65, revenueImpact: 225000 }
	]
	},
	'South Campus': {
	facilityName: 'South Campus',
	location: '3100 East Campus Way, Suite 150',
	totalRevenue: 1800000,
	patientCount: 134,
	gdmtRate: 75,
	captureRate: 38,
	breakdown: [
	{ category: 'Ablation', revenue: 780000 },
	{ category: 'LAAC', revenue: 520000 },
	{ category: 'Pacing/ICD', revenue: 340000 },
	{ category: 'Monitoring', revenue: 160000 }
	],
	providers: [
	{ name: 'Dr. Emily Davis', patients: 38, gdmtRate: 85, revenueImpact: 465000 },
	{ name: 'Dr. John Martinez', patients: 34, gdmtRate: 81, revenueImpact: 438000 },
	{ name: 'Dr. Susan Taylor', patients: 32, gdmtRate: 77, revenueImpact: 395000 },
	{ name: 'Dr. Mark Johnson', patients: 18, gdmtRate: 73, revenueImpact: 278000 },
	{ name: 'Dr. Rachel Brown', patients: 12, gdmtRate: 70, revenueImpact: 162000 }
	]
	},
	'Heart Institute': {
	facilityName: 'Heart Institute',
	location: '3201 Kings Hwy, Brooklyn, NY 11234',
	totalRevenue: 1600000,
	patientCount: 89,
	gdmtRate: 63,
	captureRate: 28,
	breakdown: [
	{ category: 'Ablation', revenue: 680000 },
	{ category: 'LAAC', revenue: 460000 },
	{ category: 'Pacing/ICD', revenue: 300000 },
	{ category: 'Monitoring', revenue: 160000 }
	],
	providers: [
	{ name: 'Dr. Alex Morgan', patients: 25, gdmtRate: 72, revenueImpact: 295000 },
	{ name: 'Dr. Jessica White', patients: 22, gdmtRate: 68, revenueImpact: 282000 },
	{ name: 'Dr. Ryan Miller', patients: 18, gdmtRate: 64, revenueImpact: 275000 },
	{ name: 'Dr. Nicole Adams', patients: 14, gdmtRate: 60, revenueImpact: 168000 },
	{ name: 'Dr. Chris Lewis', patients: 10, gdmtRate: 58, revenueImpact: 160000 }
	]
	}
	};
	return facilities[facilityName] || null;
  };

  // Handle facility click
  const handleFacilityClick = (facilityName: string) => {
	const facilityData = getElectrophysiologyFacilityData(facilityName);
	if (facilityData) {
	setSelectedFacility(facilityData);
	}
  };

  // Handle revenue opportunity click
  const handleOpportunityClick = () => {
	setShowOpportunityModal(true);
  };

  // Sample ZIP code data for arrhythmia risk & readmission hotspots
  const epZipData = [
	{ zipCode: "10001", patientCount: 64, riskScore: 8.9, riskLevel: "High" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10002", patientCount: 58, riskScore: 8.4, riskLevel: "High" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10003", patientCount: 45, riskScore: 6.7, riskLevel: "Medium" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10009", patientCount: 52, riskScore: 7.8, riskLevel: "High" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10010", patientCount: 41, riskScore: 6.2, riskLevel: "Medium" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10011", patientCount: 38, riskScore: 5.6, riskLevel: "Medium" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10012", patientCount: 59, riskScore: 8.6, riskLevel: "High" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10013", patientCount: 46, riskScore: 7.1, riskLevel: "High" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10014", patientCount: 50, riskScore: 7.5, riskLevel: "High" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10016", patientCount: 43, riskScore: 6.5, riskLevel: "Medium" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10017", patientCount: 37, riskScore: 5.4, riskLevel: "Medium" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10018", patientCount: 47, riskScore: 7.2, riskLevel: "High" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "75003", patientCount: 42, riskScore: 6.3, riskLevel: "Medium" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10021", patientCount: 33, riskScore: 4.8, riskLevel: "Medium" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10022", patientCount: 35, riskScore: 5.1, riskLevel: "Medium" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10023", patientCount: 49, riskScore: 7.6, riskLevel: "High" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10024", patientCount: 44, riskScore: 6.8, riskLevel: "Medium" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "75002", patientCount: 46, riskScore: 7.0, riskLevel: "Medium" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10026", patientCount: 61, riskScore: 9.2, riskLevel: "High" as const, conditionType: "AFib/Arrhythmia Risk" },
	{ zipCode: "10027", patientCount: 55, riskScore: 8.7, riskLevel: "High" as const, conditionType: "AFib/Arrhythmia Risk" }
  ];

  const handleZipClick = (zipCode: string) => {
	setSelectedZip(zipCode);
  };

  // Generate export data for electrophysiology
  const generateExportData = (): ExportData => {
	return {
	filename: 'electrophysiology-heart-executive-report',
	title: 'Electrophysiology Executive Dashboard',
	headers: ['Metric', 'Value', 'Target', 'Variance'],
	rows: [
	['Total Revenue Opportunity', '$10.3M', '$12M', '-$1.7M'],
	['Patient Population', '892', '1000', '-108'],
	['Ablation Devices', '325', '400', '-75'],
	['LAAC Success Rate', '96%', '92%', '+4%'],
	['30-Day Mortality', '1.8%', '2.5%', '-0.7%'],
	['Heart Team Utilization', '98%', '85%', '+13%'],
	],
	metadata: {
	reportDate: new Date().toISOString(),
	module: 'Electrophysiology',
	dataSource: 'TAILRD Analytics Platform',
	lastUpdated: '2024-01-15T10:30:00Z'
	}
	};
  };

  return (
	<div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>

	<div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
      {/* Tier header - Export folded in as a right-aligned utility (closes the EP-side
          AUDIT-161 export-above-headline inversion; the first SECTION is now the KPI
          summary, matching the HF exemplar). */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold font-display text-titanium-800">Electrophysiology Executive Dashboard</h2>
        <ExportButton
          data={generateExportData()}
          variant="outline"
          size="sm"
          className="shadow-sm hover:shadow-md transition-all duration-300"
        />
      </div>

      {/* 1. KPI summary - live patients / open gaps / device candidates (the tier
          previously rendered NO live KPI summary) + 3 demo-labeled financial cards. */}
      <EPExecutiveSummary dashboard={dashboard} loading={dashboardLoading} error={dashboardError} />

      {/* 2. Clinical Gap Intelligence - live headline (totalOpenGaps + real totalPatients),
          demo-badged composition (donut / top-gaps / safety are illustrative). */}
      <GapIntelligenceCard
        data={{
          totalGaps: dashboard?.summary?.totalOpenGaps ?? 0,
          categories: EP_DEMO_CATEGORIES,
          topGaps: EP_DEMO_TOPGAPS,
          safetyAlert: EP_DEMO_SAFETY_ALERT,
        }}
        totalPatients={dashboard?.summary?.totalPatients ?? 0}
        compositionDemo
      />

      {/* 3. Revenue Opportunity Waterfall - single demo model (epDemoFinancials). */}
      <div className="metal-card relative z-10 mb-6">
        <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-titanium-900 mb-1">Ablation & LAAC Revenue Opportunity</h3>
              <p className="text-sm text-titanium-600">Annual revenue opportunity by electrophysiology intervention</p>
            </div>
            <DemoDataBadge />
          </div>
        </div>
        <div className="p-6">
          <EPROIWaterfall
            data={{
              gdmt_revenue: EP_DEMO_WATERFALL.ablation_revenue,
              devices_revenue: EP_DEMO_WATERFALL.devices_revenue,
              phenotypes_revenue: EP_DEMO_WATERFALL.phenotypes_revenue,
              _340b_revenue: EP_DEMO_WATERFALL._340b_revenue,
              total_revenue: EP_DEMO_WATERFALL.total_revenue,
              realized_revenue: EP_DEMO_WATERFALL.realized_revenue,
            }}
            onCategoryClick={setSelectedWaterfallCategory}
          />
        </div>
      </div>

      {/* 4. DRG / CMI performance - promoted from last to sit with the financials
          (matching the HF exemplar order). Clickable DRG cards preserved. */}
      <div className="metal-card relative z-10 mb-6">
        <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-titanium-900 mb-2">Electrophysiology DRG Performance</h3>
              <p className="text-sm text-titanium-600">Key DRG categories and financial performance metrics</p>
            </div>
            <DemoDataBadge label="Demo data - DRG billing source pending" />
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {(electrophysiologyData.drgs?.slice(0, 3) || [getDRGData('266'), getDRGData('267'), getDRGData('269')]).filter(Boolean).map((drg, index) => {
              const drgCode = drg.code;
              const drgColors = [
                { value: '#C4982A', bg: '#FAF6E8', border: '#D4B85C' },
                { value: '#4A6880', bg: '#F0F5FA', border: '#C8D4DC' },
                { value: '#9B2438', bg: '#FDF2F3', border: '#F5C0C8' },
              ];
              const dc = drgColors[index] || drgColors[0];
              return (
                <div
                  key={drg.code}
                  onClick={() => {
                    const drgData = getEPDRGDetailData(drgCode);
                    if (drgData) setSelectedDRG(drgData);
                  }}
                  className="rounded-xl p-4 border shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                  style={{ background: `linear-gradient(to right, white, ${dc.bg})`, borderColor: dc.border }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="w-8 h-8" style={{ color: dc.value }} />
                    <div>
                      <div className="font-semibold text-neutral-800">{drg.name}</div>
                      <div className="text-2xl font-bold" style={{ color: dc.value }}>${toFixed(drg.reimbursement / 1000, 0)}K</div>
                    </div>
                  </div>
                  <div className="text-sm text-teal-500 mb-2">
                    {drg.cases} cases
                  </div>
                  <div className="text-sm" style={{ color: drg.margin > 30 ? '#2C4A60' : '#9B2438' }}>
                    {toFixed(drg.margin, 1)}% margin
                  </div>
                </div>
              );
            })}
          </div>

          {/* Case Mix Index Performance */}
          <div className="bg-white rounded-xl p-4 border border-titanium-200 shadow-lg">
            <h4 className="font-semibold text-titanium-900 mb-4">Electrophysiology Case Mix Index (CMI) Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: '#2C4A60' }}>3.78</div>
                <div className="text-sm text-titanium-600">Current CMI</div>
                <div className="text-xs text-teal-700">+0.28 vs target</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: '#8B6914' }}>$524K</div>
                <div className="text-sm text-titanium-600">Monthly Opportunity</div>
                <div className="text-xs text-titanium-500">From DRG optimization</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: '#2D6147' }}>96.2%</div>
                <div className="text-sm text-titanium-600">Documentation Rate</div>
                <div className="text-xs text-titanium-500">CC/MCC capture</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: '#1A6878' }}>2.8</div>
                <div className="text-sm text-titanium-600">Avg LOS</div>
                <div className="text-xs text-teal-700">vs 3.2 benchmark</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Projected vs Realized + Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 mb-6">
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
            <EPProjectedVsRealizedChart onMonthClick={handleMonthClick} />
          </div>
        </div>

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
            <EPBenchmarksPanel onBenchmarkClick={handleBenchmarkClick} />
          </div>
        </div>
      </div>

      {/* 6. Forward Outlook - consolidated 12-month projection (replaces the former
          pipeline / at-risk / trajectory / predictive cluster; one panel, one demo
          model). Its DemoDataBadge is internal to the panel. */}
      <EPForwardOutlookPanel />

      {/* 7. Revenue by Facility - clickable facility list opens a fabricated-detail
          modal (demo-badged); the affordance is preserved. */}
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
          <h4 className="text-lg font-semibold text-titanium-900 mb-4">Facility Revenue Opportunities</h4>
          <div className="space-y-3">
            {[
              { facility: 'Main Campus', current: '$4.2M', potential: '$5.8M', opportunity: '$1.6M', devices: 247 },
              { facility: 'North Center', current: '$2.1M', potential: '$3.2M', opportunity: '$1.1M', devices: 156 },
              { facility: 'South Campus', current: '$1.8M', potential: '$2.7M', opportunity: '$0.9M', devices: 134 },
              { facility: 'Heart Institute', current: '$1.6M', potential: '$2.1M', opportunity: '$0.5M', devices: 89 }
            ].map((item) => (
              <div
                key={item.facility}
                onClick={() => handleFacilityClick(item.facility)}
                className="bg-white p-4 rounded-lg border border-titanium-200 hover:border-porsche-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-titanium-900">{item.facility}</div>
                    <div className="text-sm text-titanium-600">{item.devices} devices annually</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-teal-700">{item.opportunity}</div>
                    <div className="text-xs text-titanium-500">{item.current} &rarr; {item.potential}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8. Geographic Heat Map */}
      <div className="mb-6">
        <ZipHeatMap
          title="AFib & Arrhythmia Risk & Readmission Hotspots"
          data={epZipData}
          onZipClick={handleZipClick}
          centerLat={40.7589}
          centerLng={-73.9851}
          zoom={12}
        />
      </div>

      {/* Revenue Opportunities Pipeline - kept near the financials cluster (physically
          last, matching the HF exemplar), demo-badged. */}
      <div className="mb-6">
        <div
          onClick={() => setShowOpportunityModal(true)}
          className="bg-gradient-to-br from-[#f0f4f8] to-[#e8eef3] rounded-lg border-2 border-titanium-300 p-8 cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-3">
                <TrendingUp className="w-6 h-6 text-teal-700 mr-2" />
                <h3 className="text-xl font-bold mr-3">Revenue Opportunities Pipeline</h3>
                <DemoDataBadge label="Demo data - DRG billing source pending" />
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
              {/* Explicit handler: previously relied on event-bubble to the parent card;
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

      </div>

      	{/* Revenue Waterfall Modal */}
	{selectedWaterfallCategory && (
	<EPRevenueWaterfallModal
	category={selectedWaterfallCategory}
	totalRevenue={getCategoryData(selectedWaterfallCategory).revenue}
	patientCount={getCategoryData(selectedWaterfallCategory).patientCount}
	onClose={() => setSelectedWaterfallCategory(null)}
	/>
	)}

	{/* Month Detail Modal */}
	{selectedMonth && (
	<EPMonthDetailModal
	month={selectedMonth.month}
	projected={selectedMonth.projected}
	realized={selectedMonth.realized}
	breakdown={selectedMonth.breakdown}
	onClose={() => setSelectedMonth(null)}
	/>
	)}

	{/* Benchmark Detail Modal */}
	{selectedBenchmark && (
	<EPBenchmarkDetailModal
	{...selectedBenchmark}
	onClose={() => setSelectedBenchmark(null)}
	/>
	)}

	{/* Facility Detail Modal */}
	{selectedFacility && (
	<EPFacilityDetailModal
	{...selectedFacility}
	onClose={() => setSelectedFacility(null)}
	/>
	)}

	{/* Revenue Opportunity Modal */}
	{showOpportunityModal && (
	<EPRevenueOpportunityModal
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
	setShowOpportunityModal(false);
	window.location.hash = '#/electrophysiology-heart/service-line';
	}}
	/>
	)}


	{/* ZIP Detail Modal */}
	{selectedZip && (() => {
	const zipInfo = epZipData.find(z => z.zipCode === selectedZip);
	return (
	<BaseDetailModal
	title={`ZIP Code ${selectedZip}`}
	subtitle="EP Risk & Readmission Patient Summary"
	icon={<Heart className="w-6 h-6" />}
	summaryMetrics={[
	{ label: 'Patients', value: zipInfo?.patientCount?.toString() || '0', colorScheme: 'porsche' },
	{ label: 'Risk Score', value: zipInfo?.riskScore != null ? toFixed(zipInfo.riskScore, 1) : 'N/A', colorScheme: zipInfo && zipInfo.riskScore >= 7 ? 'crimson' : 'amber' },
	{ label: 'Risk Level', value: zipInfo?.riskLevel || 'N/A' },
	{ label: 'Condition', value: 'EP Arrhythmia Risk' },
	]}
	onClose={() => setSelectedZip(null)}
	/>
	);
	})()}

	{/* DRG Detail Modal */}
	{selectedDRG && (
	<EPDRGDetailModal
	drgCode={selectedDRG.drgCode}
	description={selectedDRG.description}
	volume={selectedDRG.volume}
	avgReimbursement={selectedDRG.avgReimbursement}
	totalRevenue={selectedDRG.totalRevenue}
	avgLos={selectedDRG.avgLos}
	avgCost={selectedDRG.avgCost}
	margin={selectedDRG.margin}
	targetLos={selectedDRG.targetLos}
	hospitalAvgLos={selectedDRG.hospitalAvgLos}
	nationalBenchmarkLos={selectedDRG.nationalBenchmarkLos}
	cases={selectedDRG.cases}
	onClose={() => setSelectedDRG(null)}
	/>
	)}
	</div>
  );
};

export default ElectrophysiologyExecutiveView;