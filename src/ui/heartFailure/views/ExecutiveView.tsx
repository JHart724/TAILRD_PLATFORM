import React, { useState } from 'react';
import { DollarSign, Users, TrendingUp, Target, ChevronRight } from 'lucide-react';
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
import { HFExecutiveSummary } from '../../../components/heartFailure/HFExecutiveSummary';
import { HFRevenueWaterfallModal } from '../../../components/heartFailure/HFRevenueWaterfallModal';
import HFMonthDetailModal from '../../../components/heartFailure/HFMonthDetailModal';
import HFBenchmarkDetailModal from '../../../components/heartFailure/HFBenchmarkDetailModal';
import HFFacilityDetailModal from '../../../components/heartFailure/HFFacilityDetailModal';
import HFRevenueOpportunityModal from '../../../components/heartFailure/HFRevenueOpportunityModal';
import HFDRGDetailModal from '../../../components/heartFailure/HFDRGDetailModal';

const ExecutiveView: React.FC = () => {
  const [selectedWaterfallCategory, setSelectedWaterfallCategory] = useState<'GDMT' | 'Devices' | 'Phenotypes' | '340B' | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<any>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<any>(null);
  const [selectedFacility, setSelectedFacility] = useState<any>(null);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [selectedDRG, setSelectedDRG] = useState<any>(null);

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

  // Generate facility detail data
  const getFacilityData = (facilityName: string) => {
    const facilities: Record<string, any> = {
      'Main Campus': {
        facilityName: 'Main Campus',
        location: 'Upper East Side, Manhattan',
        totalRevenue: 2100000, // $2.1M (34%)
        patientCount: 1050,
        gdmtRate: 68,
        captureRate: 35,
        breakdown: [
          { category: 'GDMT', revenue: 850000 },
          { category: 'Devices', revenue: 630000 },
          { category: 'Phenotypes', revenue: 420000 },
          { category: '340B', revenue: 200000 }
        ],
        providers: [
          { name: 'Dr. Sarah Chen', patients: 185, gdmtRate: 78, revenueImpact: 245000 },
          { name: 'Dr. Michael Rodriguez', patients: 162, gdmtRate: 74, revenueImpact: 208000 },
          { name: 'Dr. Jennifer Kim', patients: 148, gdmtRate: 71, revenueImpact: 189000 },
          { name: 'Dr. David Thompson', patients: 134, gdmtRate: 65, revenueImpact: 165000 },
          { name: 'Dr. Lisa Wang', patients: 125, gdmtRate: 62, revenueImpact: 148000 }
        ]
      },
      'North Clinic': {
        facilityName: 'North Clinic',
        location: 'Harlem, Manhattan',
        totalRevenue: 1600000, // $1.6M (26%)
        patientCount: 820,
        gdmtRate: 72,
        captureRate: 42,
        breakdown: [
          { category: 'GDMT', revenue: 640000 },
          { category: 'Devices', revenue: 480000 },
          { category: 'Phenotypes', revenue: 320000 },
          { category: '340B', revenue: 160000 }
        ],
        providers: [
          { name: 'Dr. James Wilson', patients: 152, gdmtRate: 82, revenueImpact: 198000 },
          { name: 'Dr. Maria Gonzalez', patients: 138, gdmtRate: 79, revenueImpact: 185000 },
          { name: 'Dr. Robert Lee', patients: 126, gdmtRate: 75, revenueImpact: 165000 },
          { name: 'Dr. Amanda Foster', patients: 118, gdmtRate: 68, revenueImpact: 142000 },
          { name: 'Dr. Kevin Park', patients: 105, gdmtRate: 65, revenueImpact: 125000 }
        ]
      },
      'South Campus': {
        facilityName: 'South Campus',
        location: 'Lower Manhattan',
        totalRevenue: 1800000, // $1.8M (29%)
        patientCount: 950,
        gdmtRate: 75,
        captureRate: 38,
        breakdown: [
          { category: 'GDMT', revenue: 720000 },
          { category: 'Devices', revenue: 540000 },
          { category: 'Phenotypes', revenue: 360000 },
          { category: '340B', revenue: 180000 }
        ],
        providers: [
          { name: 'Dr. Emily Davis', patients: 175, gdmtRate: 85, revenueImpact: 265000 },
          { name: 'Dr. John Martinez', patients: 158, gdmtRate: 81, revenueImpact: 238000 },
          { name: 'Dr. Susan Taylor', patients: 142, gdmtRate: 77, revenueImpact: 195000 },
          { name: 'Dr. Mark Johnson', patients: 135, gdmtRate: 73, revenueImpact: 178000 },
          { name: 'Dr. Rachel Brown', patients: 128, gdmtRate: 70, revenueImpact: 162000 }
        ]
      },
      'East Clinic': {
        facilityName: 'East Clinic',
        location: 'East Village, Manhattan',
        totalRevenue: 700000, // $0.7M (11%)
        patientCount: 380,
        gdmtRate: 63,
        captureRate: 28,
        breakdown: [
          { category: 'GDMT', revenue: 280000 },
          { category: 'Devices', revenue: 210000 },
          { category: 'Phenotypes', revenue: 140000 },
          { category: '340B', revenue: 70000 }
        ],
        providers: [
          { name: 'Dr. Alex Morgan', patients: 85, gdmtRate: 72, revenueImpact: 95000 },
          { name: 'Dr. Jessica White', patients: 78, gdmtRate: 68, revenueImpact: 82000 },
          { name: 'Dr. Ryan Miller', patients: 72, gdmtRate: 64, revenueImpact: 75000 },
          { name: 'Dr. Nicole Adams', patients: 68, gdmtRate: 60, revenueImpact: 68000 },
          { name: 'Dr. Chris Lewis', patients: 62, gdmtRate: 58, revenueImpact: 60000 }
        ]
      }
    };
    return facilities[facilityName] || null;
  };

  // Handle facility click
  const handleFacilityClick = (facilityName: string) => {
    const facilityData = getFacilityData(facilityName);
    if (facilityData) {
      setSelectedFacility(facilityData);
    }
  };

  // Handle revenue opportunity click
  const handleOpportunityClick = () => {
    setShowOpportunityModal(true);
  };

  // Get DRG-specific data
  const getDRGData = (drgCode: string) => {
    const drgData: Record<string, any> = {
      'DRG 291': {
        drgCode: 'DRG 291',
        description: 'Heart Failure & Shock w MCC',
        volume: 456,
        avgReimbursement: 78940,
        totalRevenue: 36012640,
        avgLos: 5.2,
        avgCost: 66500,
        margin: 31.6,
        targetLos: 4.8,
        hospitalAvgLos: 5.8,
        nationalBenchmarkLos: 6.1,
        cases: [
          { caseId: 'HF-291-001', ageRange: '75-84', los: 4.2, cost: 58000, revenue: 78940, margin: 20940, marginPercent: 26.5 },
          { caseId: 'HF-291-002', ageRange: '65-74', los: 6.1, cost: 72000, revenue: 78940, margin: 6940, marginPercent: 8.8 },
          { caseId: 'HF-291-003', ageRange: '85+', los: 3.8, cost: 61000, revenue: 78940, margin: 17940, marginPercent: 22.7 },
          { caseId: 'HF-291-004', ageRange: '55-64', los: 7.2, cost: 84000, revenue: 78940, margin: -5060, marginPercent: -6.4 },
          { caseId: 'HF-291-005', ageRange: '75-84', los: 4.9, cost: 59500, revenue: 78940, margin: 19440, marginPercent: 24.6 },
          { caseId: 'HF-291-006', ageRange: '65-74', los: 5.8, cost: 68200, revenue: 78940, margin: 10740, marginPercent: 13.6 },
          { caseId: 'HF-291-007', ageRange: '85+', los: 6.5, cost: 75800, revenue: 78940, margin: 3140, marginPercent: 4.0 },
          { caseId: 'HF-291-008', ageRange: '55-64', los: 3.1, cost: 52000, revenue: 78940, margin: 26940, marginPercent: 34.1 },
          { caseId: 'HF-291-009', ageRange: '75-84', los: 5.4, cost: 63800, revenue: 78940, margin: 15140, marginPercent: 19.2 },
          { caseId: 'HF-291-010', ageRange: '65-74', los: 4.7, cost: 57200, revenue: 78940, margin: 21740, marginPercent: 27.5 }
        ]
      },
      'DRG 292': {
        drgCode: 'DRG 292',
        description: 'Heart Failure & Shock w CC',
        volume: 823,
        avgReimbursement: 52680,
        totalRevenue: 43355640,
        avgLos: 3.8,
        avgCost: 42200,
        margin: 32.1,
        targetLos: 3.5,
        hospitalAvgLos: 4.2,
        nationalBenchmarkLos: 4.5,
        cases: [
          { caseId: 'HF-292-001', ageRange: '65-74', los: 3.2, cost: 38000, revenue: 52680, margin: 14680, marginPercent: 27.9 },
          { caseId: 'HF-292-002', ageRange: '75-84', los: 4.1, cost: 45200, revenue: 52680, margin: 7480, marginPercent: 14.2 },
          { caseId: 'HF-292-003', ageRange: '55-64', los: 2.8, cost: 35600, revenue: 52680, margin: 17080, marginPercent: 32.4 },
          { caseId: 'HF-292-004', ageRange: '85+', los: 4.9, cost: 48900, revenue: 52680, margin: 3780, marginPercent: 7.2 },
          { caseId: 'HF-292-005', ageRange: '65-74', los: 3.6, cost: 41200, revenue: 52680, margin: 11480, marginPercent: 21.8 },
          { caseId: 'HF-292-006', ageRange: '55-64', los: 3.1, cost: 37800, revenue: 52680, margin: 14880, marginPercent: 28.3 },
          { caseId: 'HF-292-007', ageRange: '75-84', los: 4.4, cost: 46500, revenue: 52680, margin: 6180, marginPercent: 11.7 },
          { caseId: 'HF-292-008', ageRange: '85+', los: 5.2, cost: 51200, revenue: 52680, margin: 1480, marginPercent: 2.8 },
          { caseId: 'HF-292-009', ageRange: '65-74', los: 3.4, cost: 39800, revenue: 52680, margin: 12880, marginPercent: 24.5 },
          { caseId: 'HF-292-010', ageRange: '55-64', los: 2.9, cost: 36400, revenue: 52680, margin: 16280, marginPercent: 30.9 }
        ]
      },
      'DRG 293': {
        drgCode: 'DRG 293',
        description: 'Heart Failure & Shock w/o CC/MCC',
        volume: 612,
        avgReimbursement: 38420,
        totalRevenue: 23513040,
        avgLos: 2.1,
        avgCost: 31200,
        margin: 35.2,
        targetLos: 2.0,
        hospitalAvgLos: 2.5,
        nationalBenchmarkLos: 2.8,
        cases: [
          { caseId: 'HF-293-001', ageRange: '55-64', los: 1.8, cost: 28000, revenue: 38420, margin: 10420, marginPercent: 27.1 },
          { caseId: 'HF-293-002', ageRange: '65-74', los: 2.3, cost: 32500, revenue: 38420, margin: 5920, marginPercent: 15.4 },
          { caseId: 'HF-293-003', ageRange: '75-84', los: 1.9, cost: 29200, revenue: 38420, margin: 9220, marginPercent: 24.0 },
          { caseId: 'HF-293-004', ageRange: '85+', los: 2.8, cost: 35800, revenue: 38420, margin: 2620, marginPercent: 6.8 },
          { caseId: 'HF-293-005', ageRange: '55-64', los: 1.6, cost: 26800, revenue: 38420, margin: 11620, marginPercent: 30.2 },
          { caseId: 'HF-293-006', ageRange: '65-74', los: 2.1, cost: 30900, revenue: 38420, margin: 7520, marginPercent: 19.6 },
          { caseId: 'HF-293-007', ageRange: '75-84', los: 2.4, cost: 33200, revenue: 38420, margin: 5220, marginPercent: 13.6 },
          { caseId: 'HF-293-008', ageRange: '55-64', los: 1.7, cost: 27600, revenue: 38420, margin: 10820, marginPercent: 28.2 },
          { caseId: 'HF-293-009', ageRange: '85+', los: 2.6, cost: 34500, revenue: 38420, margin: 3920, marginPercent: 10.2 },
          { caseId: 'HF-293-010', ageRange: '65-74', los: 2.0, cost: 30200, revenue: 38420, margin: 8220, marginPercent: 21.4 }
        ]
      }
    };
    return drgData[drgCode];
  };

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
    { zipCode: "10019", patientCount: 42, riskScore: 6.3, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
    { zipCode: "10021", patientCount: 33, riskScore: 4.8, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
    { zipCode: "10022", patientCount: 35, riskScore: 5.1, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
    { zipCode: "10023", patientCount: 49, riskScore: 7.6, riskLevel: "High" as const, conditionType: "HF Decompensation Risk" },
    { zipCode: "10024", patientCount: 44, riskScore: 6.8, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
    { zipCode: "10025", patientCount: 46, riskScore: 7.0, riskLevel: "Medium" as const, conditionType: "HF Decompensation Risk" },
    { zipCode: "10026", patientCount: 61, riskScore: 9.2, riskLevel: "High" as const, conditionType: "HF Decompensation Risk" },
    { zipCode: "10027", patientCount: 55, riskScore: 8.7, riskLevel: "High" as const, conditionType: "HF Decompensation Risk" }
  ];

  const handleZipClick = (zipCode: string) => {
    console.log(`Drilling down to HF decompensation risk patients for ZIP ${zipCode}`);
    // TODO: Navigate to patient list view filtered by ZIP code
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/20 p-6 relative overflow-hidden">
      {/* Web 3.0 Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
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

        {/* #2: Revenue Opportunity Waterfall */}
        <div className="retina-card card-web3-hover relative z-10 mb-6">
          <div className="px-6 py-4 border-b border-white/30 bg-gradient-to-r from-white/60 to-blue-50/40 backdrop-blur-md">
            <h3 className="text-xl font-bold text-steel-900 mb-1">Revenue Opportunity Waterfall</h3>
            <p className="text-sm text-steel-600">Annual revenue opportunity by intervention category</p>
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
          <div className="retina-card card-web3-hover">
            <div className="px-6 py-4 border-b border-white/30 bg-gradient-to-r from-white/60 to-blue-50/40 backdrop-blur-md">
              <h3 className="text-lg font-semibold text-steel-900 mb-1">Projected vs Realized Revenue</h3>
              <p className="text-sm text-steel-600">Revenue tracking and variance analysis</p>
            </div>
            <div className="p-6">
              <ProjectedVsRealizedChart onMonthClick={handleMonthClick} />
            </div>
          </div>

          {/* Benchmarks Panel */}
          <div className="retina-card card-web3-hover">
            <div className="px-6 py-4 border-b border-white/30 bg-gradient-to-r from-white/60 to-blue-50/40 backdrop-blur-md">
              <h3 className="text-lg font-semibold text-steel-900 mb-1">Performance Benchmarks</h3>
              <p className="text-sm text-steel-600">Industry comparisons and targets</p>
            </div>
            <div className="p-6">
              <BenchmarksPanel onBenchmarkClick={handleBenchmarkClick} />
            </div>
          </div>
        </div>

        {/* #5: Revenue by Facility */}
        <div className="retina-card card-web3-hover relative z-10 mb-6">
          <div className="px-6 py-4 border-b border-white/30 bg-gradient-to-r from-white/60 to-blue-50/40 backdrop-blur-md">
            <h3 className="text-lg font-semibold text-steel-900 mb-1">Revenue by Facility</h3>
            <p className="text-sm text-steel-600">Facility-level performance and opportunities</p>
          </div>
          <div className="p-6">
            <OpportunityHeatmap 
              data={[
                { site_id: 'Main Campus', opp_revenue: 2100000, rank: 1 },
                { site_id: 'South Campus', opp_revenue: 1800000, rank: 2 },
                { site_id: 'North Clinic', opp_revenue: 1600000, rank: 3 },
                { site_id: 'East Clinic', opp_revenue: 700000, rank: 4 }
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
            className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg border-2 border-emerald-200 p-8 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <TrendingUp className="w-6 h-6 text-emerald-600 mr-2" />
                  <h3 className="text-xl font-bold">Revenue Opportunities Pipeline</h3>
                </div>
                <div className="text-5xl font-bold text-emerald-600 mb-2">$127,240</div>
                <div className="text-gray-600 text-lg mb-4">23 high-priority documentation opportunities identified</div>
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <div className="text-sm text-gray-600">High Priority</div>
                    <div className="text-2xl font-bold text-red-600">8</div>
                    <div className="text-sm text-gray-500">$68,600</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <div className="text-sm text-gray-600">Medium Priority</div>
                    <div className="text-2xl font-bold text-amber-600">12</div>
                    <div className="text-sm text-gray-500">$50,240</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-sm text-gray-600">Due This Week</div>
                    <div className="text-2xl font-bold text-gray-700">8</div>
                    <div className="text-sm text-gray-500">Urgent action</div>
                  </div>
                </div>
              </div>
              
              <div className="ml-6">
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center">
                  View Pipeline Details
                  <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="retina-card card-web3-hover relative z-10 mb-6">
          <div className="px-6 py-4 border-b border-white/30 bg-gradient-to-r from-white/60 to-blue-50/40 backdrop-blur-md">
            <h3 className="text-lg font-semibold text-steel-900 mb-2">{heartFailureConfig.drgTitle}</h3>
            <p className="text-sm text-steel-600">{heartFailureConfig.drgDescription}</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {heartFailureConfig.drgPerformanceCards.map((card, index) => {
                const drgCodes = ['DRG 291', 'DRG 292', 'DRG 293'];
                const drgCode = drgCodes[index];
                return (
                <div 
                  key={index} 
                  onClick={() => {
                    const drgData = getDRGData(drgCode);
                    if (drgData) setSelectedDRG(drgData);
                  }}
                  className="bg-gradient-to-r from-white/60 to-emerald-50/60 backdrop-blur-md rounded-xl p-4 border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="w-8 h-8 text-medical-green-600" />
                    <div>
                      <div className="font-semibold text-medical-green-900">{card.title}</div>
                      <div className="text-2xl font-bold text-medical-green-800">{card.value}</div>
                    </div>
                  </div>
                  <div className="text-sm text-medical-green-700 mb-2">
                    {card.caseCount}
                  </div>
                  <div className={`text-sm ${card.isPositive ? 'text-medical-green-600' : 'text-medical-red-600'}`}>
                    {card.variance}
                  </div>
                </div>
                );
              })}
            </div>

            {/* Case Mix Index Performance */}
            <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40 shadow-lg">
              <h4 className="font-semibold text-steel-900 mb-4">{heartFailureConfig.moduleName} Case Mix Index (CMI) Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-steel-900">{heartFailureConfig.drgMetrics.currentCMI}</div>
                  <div className="text-sm text-steel-600">Current CMI</div>
                  <div className="text-xs text-medical-green-600">+0.28 vs target</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-medical-green-700">{heartFailureConfig.drgMetrics.monthlyOpportunity}</div>
                  <div className="text-sm text-steel-600">Monthly Opportunity</div>
                  <div className="text-xs text-steel-500">From DRG optimization</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-medical-amber-700">{heartFailureConfig.drgMetrics.documentationRate}</div>
                  <div className="text-sm text-steel-600">Documentation Rate</div>
                  <div className="text-xs text-steel-500">CC/MCC capture</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-steel-900">{heartFailureConfig.drgMetrics.avgLOS}</div>
                  <div className="text-sm text-steel-600">Avg LOS</div>
                  <div className="text-xs text-medical-green-600">{heartFailureConfig.drgMetrics.losBenchmark}</div>
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

      {/* Facility Detail Modal */}
      {selectedFacility && (
        <HFFacilityDetailModal
          {...selectedFacility}
          onClose={() => setSelectedFacility(null)}
        />
      )}

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
            console.log('Navigate to Service Line view');
            setShowOpportunityModal(false);
          }}
        />
      )}

      {/* DRG Detail Modal */}
      {selectedDRG && (
        <HFDRGDetailModal
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

export default ExecutiveView;