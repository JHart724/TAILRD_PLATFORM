import type {
  KPIItem,
  BenchmarkCard,
  ModuleTile,
  Opportunity,
  CareGapFunnel,
  DRGRow,
  DataSourceInfo,
  TrialEntry,
  BenchmarkPosition,
  FinancialSummary,
  MarginOpportunity,
  PopulationStat,
  ModuleProcedure,
  ModuleDRG,
  LOSRangePoint,
  CostRangePoint,
  TrialEligibility,
  RegistryEligibility,
  ModuleDetailData,
} from './types';

// ---------------------------------------------------------------------------
// 1. KPI Cards
// ---------------------------------------------------------------------------
export const CMS_KPIS: KPIItem[] = [
  {
    label: 'Total CV Patients',
    stateAValue: 12480,
    stateBValue: 13250,
    trend: { direction: 'up', value: '+6.2%' },
    unit: 'number',
    icon: 'Users',
  },
  {
    label: 'Annual Procedures',
    stateAValue: 8340,
    stateBValue: 8892,
    trend: { direction: 'up', value: '+6.6%' },
    unit: 'number',
    icon: 'Activity',
  },
  {
    label: 'CV Service Revenue',
    stateAValue: 142000000,
    stateBValue: 156000000,
    trend: { direction: 'up', value: '+9.9%' },
    unit: 'currency',
    icon: 'DollarSign',
  },
  {
    label: 'Quality Composite',
    stateAValue: 91.2,
    stateBValue: 94.1,
    trend: { direction: 'up', value: '+2.9pts' },
    unit: 'percent',
    icon: 'Target',
  },
  {
    label: '30-Day Readmission',
    stateAValue: 14.8,
    stateBValue: 12.3,
    trend: { direction: 'down', value: '-2.5pts' },
    unit: 'percent',
    icon: 'TrendingDown',
  },
  {
    label: 'Avg Length of Stay',
    stateAValue: 5.2,
    stateBValue: 4.8,
    trend: { direction: 'down', value: '-0.4 days' },
    unit: 'number',
    icon: 'Clock',
  },
];

// ---------------------------------------------------------------------------
// 2. Quality Benchmarks
// ---------------------------------------------------------------------------
export const QUALITY_BENCHMARKS: BenchmarkCard[] = [
  {
    metric: '30-Day Mortality',
    stateAValue: 3.2,
    stateBValue: 2.8,
    nationalAvg: 3.8,
    topDecile: 2.1,
    unit: 'percent',
    status: 'above',
  },
  {
    metric: 'Readmission Rate',
    stateAValue: 14.8,
    stateBValue: 12.3,
    nationalAvg: 15.5,
    topDecile: 11.2,
    unit: 'percent',
    status: 'above',
  },
  {
    metric: 'Infection Rate',
    stateAValue: 1.4,
    stateBValue: 1.1,
    nationalAvg: 1.8,
    topDecile: 0.9,
    unit: 'percent',
    status: 'above',
  },
  {
    metric: 'Patient Satisfaction',
    stateAValue: 88.5,
    stateBValue: 91.2,
    nationalAvg: 85.2,
    topDecile: 94.1,
    unit: 'number',
    status: 'above',
  },
  {
    metric: 'Door-to-Balloon Time',
    stateAValue: 62,
    stateBValue: 55,
    nationalAvg: 75,
    topDecile: 45,
    unit: 'number',
    status: 'above',
  },
];

// ---------------------------------------------------------------------------
// 3. Module Tiles
// ---------------------------------------------------------------------------
export const MODULE_TILES: ModuleTile[] = [
  {
    id: 'hf',
    name: 'Heart Failure',
    icon: 'Heart',
    patients: 4250,
    procedures: 1820,
    revenue: 48200000,
    qualityScore: 92.1,
  },
  {
    id: 'ep',
    name: 'Electrophysiology',
    icon: 'Zap',
    patients: 2180,
    procedures: 2340,
    revenue: 38500000,
    qualityScore: 94.5,
  },
  {
    id: 'sh',
    name: 'Structural Heart',
    icon: 'Box',
    patients: 890,
    procedures: 1240,
    revenue: 28700000,
    qualityScore: 96.2,
  },
  {
    id: 'coronary',
    name: 'Coronary',
    icon: 'Target',
    patients: 3420,
    procedures: 1890,
    revenue: 42100000,
    qualityScore: 91.8,
  },
  {
    id: 'valvular',
    name: 'Valvular',
    icon: 'Repeat',
    patients: 1240,
    procedures: 680,
    revenue: 18900000,
    qualityScore: 93.4,
  },
  {
    id: 'pv',
    name: 'Peripheral Vascular',
    icon: 'GitBranch',
    patients: 1580,
    procedures: 920,
    revenue: 15600000,
    qualityScore: 90.2,
  },
];

// ---------------------------------------------------------------------------
// 4. Top Opportunities
// ---------------------------------------------------------------------------
export const TOP_OPPORTUNITIES: Opportunity[] = [
  {
    title: 'HF Readmission Reduction',
    impact: '$2.4M savings',
    category: 'Quality',
    description:
      'Reducing 30-day heart failure readmissions below the national average of 15.5% through structured discharge planning, post-discharge follow-up within 7 days, and remote patient monitoring could eliminate CMS penalties and generate shared-savings revenue.',
    priority: 'high',
  },
  {
    title: 'EP Ablation Volume Growth',
    impact: '$1.8M revenue',
    category: 'Growth',
    description:
      'Increasing AF ablation referral capture from community cardiology practices by 18% through physician liaison outreach and streamlined referral workflows would close the gap with regional competitors and grow procedural volume.',
    priority: 'high',
  },
  {
    title: 'TAVR Program Expansion',
    impact: '$3.2M revenue',
    category: 'Growth',
    description:
      'Current TAVR volume sits 22% below regional peer median. Expanding the structural heart team, adding a second TAVR day, and targeting low-to-intermediate risk patients per updated ACC/AHA guidelines would capture unmet demand.',
    priority: 'medium',
  },
  {
    title: 'Care Gap Closure',
    impact: '$1.1M quality bonus',
    category: 'Quality',
    description:
      'Closing HEDIS care gaps in statin therapy post-ACS, beta-blocker adherence for HF, and anticoagulation for AF patients would improve Star Ratings and unlock quality-based incentive payments from commercial and MA contracts.',
    priority: 'medium',
  },
];

// ---------------------------------------------------------------------------
// 5. Care Gap Funnels
// ---------------------------------------------------------------------------
export const CARE_GAP_FUNNELS: CareGapFunnel[] = [
  {
    title: 'HF Beta-Blocker Adherence',
    stages: [
      { label: 'Eligible', value: 4250, percentage: 100 },
      { label: 'Screened', value: 3820, percentage: 90 },
      { label: 'Prescribed', value: 3200, percentage: 75 },
      { label: 'Adherent', value: 2680, percentage: 63 },
    ],
  },
  {
    title: 'Anticoagulation for AF',
    stages: [
      { label: 'Eligible', value: 2180, percentage: 100 },
      { label: 'Assessed', value: 1960, percentage: 90 },
      { label: 'Prescribed', value: 1740, percentage: 80 },
      { label: 'Therapeutic', value: 1480, percentage: 68 },
    ],
  },
  {
    title: 'Statin Therapy Post-ACS',
    stages: [
      { label: 'Eligible', value: 3420, percentage: 100 },
      { label: 'Screened', value: 3080, percentage: 90 },
      { label: 'Prescribed', value: 2740, percentage: 80 },
      { label: 'At Target', value: 2050, percentage: 60 },
    ],
  },
  {
    title: 'BP Control in CAD',
    stages: [
      { label: 'Eligible', value: 5200, percentage: 100 },
      { label: 'Monitored', value: 4680, percentage: 90 },
      { label: 'Treated', value: 3900, percentage: 75 },
      { label: 'Controlled', value: 3120, percentage: 60 },
    ],
  },
];

// ---------------------------------------------------------------------------
// 6. DRG Table Data
// ---------------------------------------------------------------------------
export const DRG_TABLE_DATA: DRGRow[] = [
  {
    code: '291',
    description: 'Heart Failure w MCC',
    volume: 1240,
    avgLOS: 6.2,
    reimbursement: 14200,
    margin: 8.5,
  },
  {
    code: '292',
    description: 'Heart Failure w CC',
    volume: 890,
    avgLOS: 4.8,
    reimbursement: 9800,
    margin: 12.1,
  },
  {
    code: '246',
    description: 'PCI w Drug-Eluting Stent w MCC',
    volume: 420,
    avgLOS: 3.2,
    reimbursement: 28500,
    margin: 15.2,
  },
  {
    code: '247',
    description: 'PCI w Drug-Eluting Stent w/o MCC',
    volume: 680,
    avgLOS: 2.1,
    reimbursement: 22100,
    margin: 18.4,
  },
  {
    code: '273',
    description: 'Ablation Cardiac Arrhythmia',
    volume: 340,
    avgLOS: 2.8,
    reimbursement: 31200,
    margin: 22.1,
  },
  {
    code: '216',
    description: 'Cardiac Valve w/o Cath w MCC',
    volume: 180,
    avgLOS: 8.4,
    reimbursement: 52300,
    margin: 6.8,
  },
  {
    code: '233',
    description: 'Coronary Bypass w Cath w MCC',
    volume: 120,
    avgLOS: 12.1,
    reimbursement: 68400,
    margin: 4.2,
  },
  {
    code: '228',
    description: 'Other Cardiothoracic Procedures w MCC',
    volume: 95,
    avgLOS: 9.6,
    reimbursement: 45200,
    margin: 7.3,
  },
];

// ---------------------------------------------------------------------------
// 7. Financial Summary
// ---------------------------------------------------------------------------
export const FINANCIAL_SUMMARY: FinancialSummary[] = [
  {
    label: 'Total CV Revenue',
    stateAValue: 142000000,
    stateBValue: 156000000,
    unit: 'currency',
    trend: { direction: 'up', value: '+9.9%' },
  },
  {
    label: 'Avg Operating Margin',
    stateAValue: 12.4,
    stateBValue: 14.2,
    unit: 'percent',
    trend: { direction: 'up', value: '+1.8pts' },
  },
  {
    label: 'Revenue per Case',
    stateAValue: 17020,
    stateBValue: 17540,
    unit: 'currency',
    trend: { direction: 'up', value: '+3.1%' },
  },
  {
    label: 'YoY Growth',
    stateAValue: 4.2,
    stateBValue: 6.8,
    unit: 'percent',
    trend: { direction: 'up', value: '+2.6pts' },
  },
];

// ---------------------------------------------------------------------------
// 8. Benchmark Positions
// ---------------------------------------------------------------------------
export const BENCHMARK_POSITIONS: BenchmarkPosition[] = [
  {
    metric: 'Mortality Index',
    value: 0.92,
    min: 0.5,
    max: 1.5,
    nationalAvg: 1.0,
    unit: 'ratio',
    lowerIsBetter: true,
  },
  {
    metric: 'Readmission Rate',
    value: 14.8,
    min: 8,
    max: 22,
    nationalAvg: 15.5,
    unit: '%',
    lowerIsBetter: true,
  },
  {
    metric: 'Avg LOS',
    value: 5.2,
    min: 3,
    max: 8,
    nationalAvg: 5.5,
    unit: 'days',
    lowerIsBetter: true,
  },
  {
    metric: 'Patient Satisfaction',
    value: 88.5,
    min: 70,
    max: 100,
    nationalAvg: 85.2,
    unit: 'percentile',
    lowerIsBetter: false,
  },
  {
    metric: 'Cost per Case',
    value: 17020,
    min: 12000,
    max: 25000,
    nationalAvg: 18500,
    unit: '$',
    lowerIsBetter: true,
  },
];

// ---------------------------------------------------------------------------
// 9. Clinical Trials
// ---------------------------------------------------------------------------
export const CLINICAL_TRIALS: TrialEntry[] = [
  {
    title: 'GUARDIAN-HF: GLP-1 RA in HFpEF with Obesity',
    phase: 'Phase III',
    sponsor: 'Novo Nordisk',
    condition: 'Heart Failure with Preserved Ejection Fraction',
    status: 'Recruiting',
  },
  {
    title: 'ADVENT-AF: Pulsed Field Ablation for Persistent AF',
    phase: 'Phase III',
    sponsor: 'Medtronic',
    condition: 'Persistent Atrial Fibrillation',
    status: 'Active',
  },
  {
    title: 'TRILUMINATE Pivotal: Tricuspid TEER Outcomes',
    phase: 'Phase III',
    sponsor: 'Abbott',
    condition: 'Severe Tricuspid Regurgitation',
    status: 'Active',
  },
  {
    title: 'SELECT-CABG: SGLT2i Perioperative Cardioprotection',
    phase: 'Phase II',
    sponsor: 'AstraZeneca',
    condition: 'Coronary Artery Bypass Grafting Outcomes',
    status: 'Recruiting',
  },
  {
    title: 'VOYAGER-PAD Extension: Rivaroxaban in PAD',
    phase: 'Phase IV',
    sponsor: 'Bayer / Janssen',
    condition: 'Peripheral Artery Disease',
    status: 'Completed',
  },
];

// ---------------------------------------------------------------------------
// 10. Data Sources
// ---------------------------------------------------------------------------
export const DATA_SOURCES: DataSourceInfo[] = [
  {
    name: 'CMS Medicare FFS Claims',
    type: 'Federal',
    description:
      'Fee-for-service Medicare claims including Part A inpatient, Part B outpatient, and Part D prescription data covering all enrolled beneficiaries.',
    lastUpdated: 'Q4 2024',
    coverage: '100% Medicare',
    iconColor: 'chrome-600',
  },
  {
    name: 'AHA Annual Survey',
    type: 'National Registry',
    description:
      'Comprehensive hospital-level survey data including staffing, utilization, financial metrics, and service capabilities across U.S. hospitals.',
    lastUpdated: '2024',
    coverage: '6,000+ hospitals',
    iconColor: 'emerald-600',
  },
  {
    name: 'STS National Database',
    type: 'Clinical Registry',
    description:
      'Society of Thoracic Surgeons outcomes database for adult cardiac surgery, congenital heart surgery, and general thoracic surgery.',
    lastUpdated: '2024',
    coverage: '3,400+ centers',
    iconColor: 'amber-600',
  },
  {
    name: 'ACC NCDR Registry',
    type: 'Clinical Registry',
    description:
      'National Cardiovascular Data Registry including CathPCI, chest pain, ICD, EP, and TAVR modules with risk-adjusted outcomes.',
    lastUpdated: '2024',
    coverage: '2,500+ sites',
    iconColor: 'arterial-600',
  },
];

// ---------------------------------------------------------------------------
// 11. Margin Opportunities
// ---------------------------------------------------------------------------
export const MARGIN_OPPORTUNITIES: MarginOpportunity[] = [
  {
    title: 'PCI Supply Chain Optimization',
    currentMargin: 16.8,
    targetMargin: 20.5,
    potentialUplift: 1400000,
  },
  {
    title: 'EP Lab Throughput Improvement',
    currentMargin: 22.1,
    targetMargin: 26.0,
    potentialUplift: 980000,
  },
  {
    title: 'HF Observation-to-Inpatient Conversion',
    currentMargin: 8.5,
    targetMargin: 11.2,
    potentialUplift: 720000,
  },
];

// ---------------------------------------------------------------------------
// 12. Population Stats
// ---------------------------------------------------------------------------
export const CLINICAL_IMPACT: PopulationStat[] = [
  {
    label: 'Lives Impacted',
    stateAValue: 12480,
    stateBValue: 13250,
    unit: 'number',
    icon: 'HeartPulse',
    trend: { direction: 'up', value: '+6.2%' },
  },
  {
    label: 'Complications Avoided',
    stateAValue: 340,
    stateBValue: 412,
    unit: 'number',
    icon: 'ShieldCheck',
    trend: { direction: 'up', value: '+21.2%' },
  },
  {
    label: 'Mortality Reduction',
    stateAValue: 0.6,
    stateBValue: 1.0,
    unit: 'percent',
    icon: 'TrendingDown',
    trend: { direction: 'up', value: '+0.4pts' },
  },
  {
    label: 'Readmissions Prevented',
    stateAValue: 185,
    stateBValue: 248,
    unit: 'number',
    icon: 'ArrowDownCircle',
    trend: { direction: 'up', value: '+34.1%' },
  },
];

export const POPULATION_HEALTH: PopulationStat[] = [
  {
    label: 'Population Served',
    stateAValue: 285000,
    stateBValue: 310000,
    unit: 'number',
    icon: 'Users',
    trend: { direction: 'up', value: '+8.8%' },
  },
  {
    label: 'Annual Screenings',
    stateAValue: 18400,
    stateBValue: 21200,
    unit: 'number',
    icon: 'Search',
    trend: { direction: 'up', value: '+15.2%' },
  },
  {
    label: 'Preventive Care Rate',
    stateAValue: 72.4,
    stateBValue: 78.1,
    unit: 'percent',
    icon: 'Shield',
    trend: { direction: 'up', value: '+5.7pts' },
  },
  {
    label: 'Chronic Disease Managed',
    stateAValue: 8920,
    stateBValue: 9680,
    unit: 'number',
    icon: 'Clipboard',
    trend: { direction: 'up', value: '+8.5%' },
  },
];

// ---------------------------------------------------------------------------
// 13. Per-Module Detail Data
// ---------------------------------------------------------------------------
export const MODULE_DETAIL_DATA: Record<string, ModuleDetailData> = {
  hf: {
    moduleId: 'hf',
    procedures: [
      { name: 'LVAD Implantation', cptCode: '33975', volume: 34, reimbursement: 285000, averageCost: 142000, margin: 50.2 },
      { name: 'Heart Transplant Evaluation', cptCode: '99245', volume: 89, reimbursement: 4200, averageCost: 1800, margin: 57.1 },
      { name: 'Right Heart Catheterization', cptCode: '93451', volume: 456, reimbursement: 12400, averageCost: 4200, margin: 66.1 },
      { name: 'Cardiac Resynchronization', cptCode: '33225', volume: 112, reimbursement: 189420, averageCost: 95600, margin: 49.5 },
      { name: 'Endomyocardial Biopsy', cptCode: '93505', volume: 67, reimbursement: 8750, averageCost: 3400, margin: 61.1 },
      { name: 'IV Inotrope Infusion', cptCode: '96365', volume: 234, reimbursement: 2450, averageCost: 890, margin: 63.7 },
      { name: 'CardioMEMS Implant', cptCode: '33289', volume: 78, reimbursement: 45600, averageCost: 22400, margin: 50.9 },
      { name: 'Ultrafiltration', cptCode: '90999', volume: 45, reimbursement: 6800, averageCost: 3200, margin: 52.9 },
    ],
    drgs: [
      { code: '291', name: 'HF w MCC', category: 'Medical HF', cases: 1240, reimbursement: 14200, cost: 12800, margin: 9.9, varianceVsBenchmark: -1200, avgLOS: 6.2, minLOS: 2.8, maxLOS: 14.1, avgCost: 12800, minCost: 6400, maxCost: 28600 },
      { code: '292', name: 'HF w CC', category: 'Medical HF', cases: 890, reimbursement: 9800, cost: 8200, margin: 16.3, varianceVsBenchmark: 800, avgLOS: 4.8, minLOS: 2.1, maxLOS: 10.4, avgCost: 8200, minCost: 4100, maxCost: 18200 },
      { code: '293', name: 'HF w/o CC/MCC', category: 'Medical HF', cases: 420, reimbursement: 6200, cost: 4800, margin: 22.6, varianceVsBenchmark: 1400, avgLOS: 3.4, minLOS: 1.6, maxLOS: 7.2, avgCost: 4800, minCost: 2800, maxCost: 9600 },
      { code: '215', name: 'Valve w Cath w MCC', category: 'Surgical HF', cases: 34, reimbursement: 285000, cost: 142000, margin: 50.2, varianceVsBenchmark: 42000, avgLOS: 14.2, minLOS: 8.1, maxLOS: 32.4, avgCost: 142000, minCost: 98000, maxCost: 245000 },
      { code: '222', name: 'CRT-D w MCC', category: 'Device HF', cases: 48, reimbursement: 189420, cost: 95600, margin: 49.5, varianceVsBenchmark: 24100, avgLOS: 5.8, minLOS: 2.4, maxLOS: 12.6, avgCost: 95600, minCost: 72000, maxCost: 148000 },
      { code: '223', name: 'CRT-D w/o MCC', category: 'Device HF', cases: 64, reimbursement: 142680, cost: 72300, margin: 49.3, varianceVsBenchmark: 15800, avgLOS: 3.6, minLOS: 1.8, maxLOS: 8.2, avgCost: 72300, minCost: 54000, maxCost: 112000 },
      { code: '189', name: 'Pulmonary Edema', category: 'Acute HF', cases: 186, reimbursement: 11200, cost: 9800, margin: 12.5, varianceVsBenchmark: -600, avgLOS: 5.4, minLOS: 2.2, maxLOS: 11.8, avgCost: 9800, minCost: 5200, maxCost: 21400 },
      { code: '296', name: 'CardioMEMS', category: 'Monitoring', cases: 78, reimbursement: 45600, cost: 22400, margin: 50.9, varianceVsBenchmark: 8200, avgLOS: 1.2, minLOS: 0.8, maxLOS: 2.4, avgCost: 22400, minCost: 18600, maxCost: 28400 },
    ],
    losRange: [
      { drg: 'HF w MCC', avgLOS: 6.2, minLOS: 2.8, maxLOS: 14.1 },
      { drg: 'HF w CC', avgLOS: 4.8, minLOS: 2.1, maxLOS: 10.4 },
      { drg: 'HF w/o CC', avgLOS: 3.4, minLOS: 1.6, maxLOS: 7.2 },
      { drg: 'LVAD', avgLOS: 14.2, minLOS: 8.1, maxLOS: 32.4 },
      { drg: 'CRT-D w MCC', avgLOS: 5.8, minLOS: 2.4, maxLOS: 12.6 },
      { drg: 'CRT-D w/o', avgLOS: 3.6, minLOS: 1.8, maxLOS: 8.2 },
      { drg: 'Pulm Edema', avgLOS: 5.4, minLOS: 2.2, maxLOS: 11.8 },
      { drg: 'CardioMEMS', avgLOS: 1.2, minLOS: 0.8, maxLOS: 2.4 },
    ],
    costRange: [
      { drg: 'HF w MCC', avgCost: 12800, minCost: 6400, maxCost: 28600 },
      { drg: 'HF w CC', avgCost: 8200, minCost: 4100, maxCost: 18200 },
      { drg: 'HF w/o CC', avgCost: 4800, minCost: 2800, maxCost: 9600 },
      { drg: 'LVAD', avgCost: 142000, minCost: 98000, maxCost: 245000 },
      { drg: 'CRT-D w MCC', avgCost: 95600, minCost: 72000, maxCost: 148000 },
      { drg: 'CRT-D w/o', avgCost: 72300, minCost: 54000, maxCost: 112000 },
      { drg: 'Pulm Edema', avgCost: 9800, minCost: 5200, maxCost: 21400 },
      { drg: 'CardioMEMS', avgCost: 22400, minCost: 18600, maxCost: 28400 },
    ],
    trialEligibility: [
      { trialName: 'GUARDIAN-HF', phase: 'Phase III', sponsor: 'Novo Nordisk', condition: 'HFpEF with Obesity', eligiblePatients: 342, status: 'Recruiting' },
      { trialName: 'STRONG-HF', phase: 'Phase III', sponsor: 'Roche', condition: 'Acute Decompensated HF', eligiblePatients: 218, status: 'Recruiting' },
      { trialName: 'DAPA-HF Extension', phase: 'Phase IV', sponsor: 'AstraZeneca', condition: 'HFrEF SGLT2i Outcomes', eligiblePatients: 1840, status: 'Active' },
      { trialName: 'CardioMEMS Post-Market', phase: 'Phase IV', sponsor: 'Abbott', condition: 'NYHA III HF Monitoring', eligiblePatients: 156, status: 'Active' },
    ],
    registryEligibility: [
      { registryName: 'GWTG-Heart Failure', registryBody: 'AHA', eligiblePatients: 3820, description: 'Get With The Guidelines — quality improvement for hospitalized HF patients' },
      { registryName: 'NCDR Heart Failure', registryBody: 'ACC', eligiblePatients: 4250, description: 'National Cardiovascular Data Registry HF module for outcomes tracking' },
      { registryName: 'INTERMACS', registryBody: 'STS/ISHLT', eligiblePatients: 34, description: 'Interagency Registry for Mechanically Assisted Circulatory Support (LVAD/BiVAD)' },
    ],
  },
  ep: {
    moduleId: 'ep',
    procedures: [
      { name: 'Pacemaker Implantation', cptCode: '33206-33208', volume: 245, reimbursement: 89760, averageCost: 42500, margin: 52.6 },
      { name: 'ICD Implantation', cptCode: '33249', volume: 124, reimbursement: 127340, averageCost: 68200, margin: 46.4 },
      { name: 'CRT-D Implantation', cptCode: '33224/33225', volume: 87, reimbursement: 189420, averageCost: 95600, margin: 49.5 },
      { name: 'AF Ablation', cptCode: '93656', volume: 312, reimbursement: 78950, averageCost: 35400, margin: 55.2 },
      { name: 'VT Ablation', cptCode: '93654', volume: 68, reimbursement: 142680, averageCost: 67800, margin: 52.5 },
      { name: 'LAAC (Watchman)', cptCode: '33340', volume: 156, reimbursement: 67420, averageCost: 28900, margin: 57.1 },
      { name: 'Lead Extraction', cptCode: '33234-33244', volume: 94, reimbursement: 98540, averageCost: 52300, margin: 46.9 },
      { name: 'EP Study w Ablation', cptCode: '93653', volume: 198, reimbursement: 56780, averageCost: 24600, margin: 56.7 },
    ],
    drgs: [
      { code: '241', name: 'Pacemaker w MCC', category: 'Device Implants', cases: 45, reimbursement: 127340, cost: 60200, margin: 52.7, varianceVsBenchmark: 18700, avgLOS: 4.2, minLOS: 2.1, maxLOS: 9.8, avgCost: 60200, minCost: 42000, maxCost: 98400 },
      { code: '242', name: 'Pacemaker w CC', category: 'Device Implants', cases: 135, reimbursement: 89760, cost: 42500, margin: 52.6, varianceVsBenchmark: 12400, avgLOS: 2.8, minLOS: 1.2, maxLOS: 6.4, avgCost: 42500, minCost: 28000, maxCost: 68000 },
      { code: '244', name: 'Pacemaker w/o CC/MCC', category: 'Device Implants', cases: 120, reimbursement: 67420, cost: 35800, margin: 46.9, varianceVsBenchmark: -3200, avgLOS: 1.6, minLOS: 0.8, maxLOS: 3.2, avgCost: 35800, minCost: 24000, maxCost: 52000 },
      { code: '222', name: 'ICD w MCC', category: 'ICD/CRT-D', cases: 28, reimbursement: 189420, cost: 95600, margin: 49.5, varianceVsBenchmark: 24100, avgLOS: 5.4, minLOS: 2.8, maxLOS: 12.2, avgCost: 95600, minCost: 68000, maxCost: 142000 },
      { code: '223', name: 'ICD w/o MCC', category: 'ICD/CRT-D', cases: 67, reimbursement: 142680, cost: 72300, margin: 49.3, varianceVsBenchmark: 15800, avgLOS: 3.2, minLOS: 1.4, maxLOS: 7.6, avgCost: 72300, minCost: 52000, maxCost: 108000 },
      { code: '264', name: 'Lead Extraction', category: 'ICD/CRT-D', cases: 22, reimbursement: 98540, cost: 52300, margin: 46.9, varianceVsBenchmark: 8900, avgLOS: 4.8, minLOS: 2.2, maxLOS: 11.4, avgCost: 52300, minCost: 34000, maxCost: 86000 },
      { code: '250', name: 'AF Ablation w MCC', category: 'Ablation', cases: 89, reimbursement: 78950, cost: 35200, margin: 55.4, varianceVsBenchmark: 11200, avgLOS: 2.4, minLOS: 1.0, maxLOS: 5.8, avgCost: 35200, minCost: 22000, maxCost: 58000 },
      { code: '251', name: 'VT Ablation', category: 'Ablation', cases: 34, reimbursement: 142680, cost: 67800, margin: 52.5, varianceVsBenchmark: 18400, avgLOS: 4.6, minLOS: 2.0, maxLOS: 10.2, avgCost: 67800, minCost: 45000, maxCost: 112000 },
      { code: '252', name: 'SVT Ablation', category: 'Ablation', cases: 112, reimbursement: 56780, cost: 24600, margin: 56.7, varianceVsBenchmark: 2100, avgLOS: 1.2, minLOS: 0.5, maxLOS: 2.8, avgCost: 24600, minCost: 16000, maxCost: 38000 },
      { code: '267', name: 'LAAC w MCC', category: 'Structural EP', cases: 42, reimbursement: 67420, cost: 28900, margin: 57.1, varianceVsBenchmark: 9800, avgLOS: 2.8, minLOS: 1.2, maxLOS: 6.4, avgCost: 28900, minCost: 18000, maxCost: 46000 },
      { code: '268', name: 'LAAC w/o MCC', category: 'Structural EP', cases: 47, reimbursement: 54320, cost: 24100, margin: 55.6, varianceVsBenchmark: 5200, avgLOS: 1.4, minLOS: 0.8, maxLOS: 3.2, avgCost: 24100, minCost: 16000, maxCost: 36000 },
      { code: '245', name: 'EP Study', category: 'Structural EP', cases: 78, reimbursement: 28450, cost: 12300, margin: 56.7, varianceVsBenchmark: 1800, avgLOS: 1.0, minLOS: 0.5, maxLOS: 2.4, avgCost: 12300, minCost: 8000, maxCost: 18000 },
    ],
    losRange: [
      { drg: 'PM w MCC', avgLOS: 4.2, minLOS: 2.1, maxLOS: 9.8 },
      { drg: 'PM w CC', avgLOS: 2.8, minLOS: 1.2, maxLOS: 6.4 },
      { drg: 'PM w/o CC', avgLOS: 1.6, minLOS: 0.8, maxLOS: 3.2 },
      { drg: 'ICD w MCC', avgLOS: 5.4, minLOS: 2.8, maxLOS: 12.2 },
      { drg: 'ICD w/o MCC', avgLOS: 3.2, minLOS: 1.4, maxLOS: 7.6 },
      { drg: 'Lead Extract', avgLOS: 4.8, minLOS: 2.2, maxLOS: 11.4 },
      { drg: 'AF Abl w MCC', avgLOS: 2.4, minLOS: 1.0, maxLOS: 5.8 },
      { drg: 'VT Ablation', avgLOS: 4.6, minLOS: 2.0, maxLOS: 10.2 },
      { drg: 'SVT Ablation', avgLOS: 1.2, minLOS: 0.5, maxLOS: 2.8 },
      { drg: 'LAAC w MCC', avgLOS: 2.8, minLOS: 1.2, maxLOS: 6.4 },
      { drg: 'LAAC w/o MCC', avgLOS: 1.4, minLOS: 0.8, maxLOS: 3.2 },
      { drg: 'EP Study', avgLOS: 1.0, minLOS: 0.5, maxLOS: 2.4 },
    ],
    costRange: [
      { drg: 'PM w MCC', avgCost: 60200, minCost: 42000, maxCost: 98400 },
      { drg: 'PM w CC', avgCost: 42500, minCost: 28000, maxCost: 68000 },
      { drg: 'PM w/o CC', avgCost: 35800, minCost: 24000, maxCost: 52000 },
      { drg: 'ICD w MCC', avgCost: 95600, minCost: 68000, maxCost: 142000 },
      { drg: 'ICD w/o MCC', avgCost: 72300, minCost: 52000, maxCost: 108000 },
      { drg: 'Lead Extract', avgCost: 52300, minCost: 34000, maxCost: 86000 },
      { drg: 'AF Abl w MCC', avgCost: 35200, minCost: 22000, maxCost: 58000 },
      { drg: 'VT Ablation', avgCost: 67800, minCost: 45000, maxCost: 112000 },
      { drg: 'SVT Ablation', avgCost: 24600, minCost: 16000, maxCost: 38000 },
      { drg: 'LAAC w MCC', avgCost: 28900, minCost: 18000, maxCost: 46000 },
      { drg: 'LAAC w/o MCC', avgCost: 24100, minCost: 16000, maxCost: 36000 },
      { drg: 'EP Study', avgCost: 12300, minCost: 8000, maxCost: 18000 },
    ],
    trialEligibility: [
      { trialName: 'ADVENT-AF', phase: 'Phase III', sponsor: 'Medtronic', condition: 'Persistent AF — Pulsed Field Ablation', eligiblePatients: 186, status: 'Recruiting' },
      { trialName: 'OPTION Trial', phase: 'Phase III', sponsor: 'Abbott', condition: 'Leadless Pacemaker vs Conventional', eligiblePatients: 124, status: 'Active' },
      { trialName: 'CASTLE-HTx', phase: 'Phase III', sponsor: 'Biotronik', condition: 'AF Ablation in HF Transplant Candidates', eligiblePatients: 42, status: 'Recruiting' },
      { trialName: 'RAFT-PermAF', phase: 'Phase III', sponsor: 'Population Health Research Inst', condition: 'Ablation vs Rate Control in Permanent AF', eligiblePatients: 98, status: 'Active' },
    ],
    registryEligibility: [
      { registryName: 'ACC NCDR ICD Registry', registryBody: 'ACC', eligiblePatients: 219, description: 'National outcomes tracking for implantable cardioverter-defibrillator procedures' },
      { registryName: 'NCDR EP Device Registry', registryBody: 'ACC', eligiblePatients: 456, description: 'Comprehensive electrophysiology device implant outcomes and complications' },
      { registryName: 'LAAO Registry', registryBody: 'ACC', eligiblePatients: 156, description: 'Left atrial appendage occlusion device tracking for AF stroke prevention' },
    ],
  },
  sh: {
    moduleId: 'sh',
    procedures: [
      { name: 'TAVR', cptCode: '33361/33362', volume: 186, reimbursement: 168500, averageCost: 82400, margin: 51.1 },
      { name: 'MitraClip/TEER', cptCode: '33418', volume: 94, reimbursement: 142800, averageCost: 68400, margin: 52.1 },
      { name: 'Balloon Valvuloplasty', cptCode: '92986', volume: 42, reimbursement: 28600, averageCost: 12400, margin: 56.6 },
      { name: 'ASD/PFO Closure', cptCode: '93580/93581', volume: 68, reimbursement: 52400, averageCost: 24800, margin: 52.7 },
      { name: 'Paravalvular Leak Closure', cptCode: '93590', volume: 24, reimbursement: 86200, averageCost: 42000, margin: 51.3 },
      { name: 'LAAC (Watchman)', cptCode: '33340', volume: 112, reimbursement: 67420, averageCost: 28900, margin: 57.1 },
      { name: 'Alcohol Septal Ablation', cptCode: '93583', volume: 18, reimbursement: 42800, averageCost: 18600, margin: 56.5 },
      { name: 'Structural Imaging (TEE)', cptCode: '93312-93318', volume: 340, reimbursement: 4800, averageCost: 1600, margin: 66.7 },
    ],
    drgs: [
      { code: '216', name: 'Valve w/o Cath w MCC', category: 'Valve Surgery', cases: 82, reimbursement: 52300, cost: 48200, margin: 7.8, varianceVsBenchmark: -4200, avgLOS: 8.4, minLOS: 4.2, maxLOS: 22.6, avgCost: 48200, minCost: 32000, maxCost: 86000 },
      { code: '217', name: 'Valve w/o Cath w CC', category: 'Valve Surgery', cases: 98, reimbursement: 38400, cost: 28600, margin: 25.5, varianceVsBenchmark: 4800, avgLOS: 5.6, minLOS: 3.0, maxLOS: 14.2, avgCost: 28600, minCost: 18000, maxCost: 52000 },
      { code: '219', name: 'TAVR', category: 'Transcatheter', cases: 186, reimbursement: 168500, cost: 82400, margin: 51.1, varianceVsBenchmark: 32000, avgLOS: 3.8, minLOS: 1.4, maxLOS: 12.4, avgCost: 82400, minCost: 62000, maxCost: 128000 },
      { code: '220', name: 'TEER (MitraClip)', category: 'Transcatheter', cases: 94, reimbursement: 142800, cost: 68400, margin: 52.1, varianceVsBenchmark: 28400, avgLOS: 2.6, minLOS: 1.2, maxLOS: 8.4, avgCost: 68400, minCost: 48000, maxCost: 108000 },
      { code: '266', name: 'ASD/PFO Closure', category: 'Congenital', cases: 68, reimbursement: 52400, cost: 24800, margin: 52.7, varianceVsBenchmark: 8600, avgLOS: 1.8, minLOS: 0.8, maxLOS: 4.2, avgCost: 24800, minCost: 16000, maxCost: 42000 },
      { code: '267', name: 'LAAC', category: 'Appendage', cases: 112, reimbursement: 67420, cost: 28900, margin: 57.1, varianceVsBenchmark: 12400, avgLOS: 1.6, minLOS: 0.8, maxLOS: 4.0, avgCost: 28900, minCost: 18000, maxCost: 46000 },
      { code: '274', name: 'Paravalvular Leak', category: 'Transcatheter', cases: 24, reimbursement: 86200, cost: 42000, margin: 51.3, varianceVsBenchmark: 14200, avgLOS: 4.2, minLOS: 2.0, maxLOS: 10.8, avgCost: 42000, minCost: 28000, maxCost: 72000 },
      { code: '275', name: 'Alcohol Septal Ablation', category: 'Transcatheter', cases: 18, reimbursement: 42800, cost: 18600, margin: 56.5, varianceVsBenchmark: 6800, avgLOS: 4.8, minLOS: 2.4, maxLOS: 9.6, avgCost: 18600, minCost: 12000, maxCost: 32000 },
    ],
    losRange: [
      { drg: 'Valve w MCC', avgLOS: 8.4, minLOS: 4.2, maxLOS: 22.6 },
      { drg: 'Valve w CC', avgLOS: 5.6, minLOS: 3.0, maxLOS: 14.2 },
      { drg: 'TAVR', avgLOS: 3.8, minLOS: 1.4, maxLOS: 12.4 },
      { drg: 'TEER', avgLOS: 2.6, minLOS: 1.2, maxLOS: 8.4 },
      { drg: 'ASD/PFO', avgLOS: 1.8, minLOS: 0.8, maxLOS: 4.2 },
      { drg: 'LAAC', avgLOS: 1.6, minLOS: 0.8, maxLOS: 4.0 },
      { drg: 'PVL Closure', avgLOS: 4.2, minLOS: 2.0, maxLOS: 10.8 },
      { drg: 'Septal Abl', avgLOS: 4.8, minLOS: 2.4, maxLOS: 9.6 },
    ],
    costRange: [
      { drg: 'Valve w MCC', avgCost: 48200, minCost: 32000, maxCost: 86000 },
      { drg: 'Valve w CC', avgCost: 28600, minCost: 18000, maxCost: 52000 },
      { drg: 'TAVR', avgCost: 82400, minCost: 62000, maxCost: 128000 },
      { drg: 'TEER', avgCost: 68400, minCost: 48000, maxCost: 108000 },
      { drg: 'ASD/PFO', avgCost: 24800, minCost: 16000, maxCost: 42000 },
      { drg: 'LAAC', avgCost: 28900, minCost: 18000, maxCost: 46000 },
      { drg: 'PVL Closure', avgCost: 42000, minCost: 28000, maxCost: 72000 },
      { drg: 'Septal Abl', avgCost: 18600, minCost: 12000, maxCost: 32000 },
    ],
    trialEligibility: [
      { trialName: 'TRILUMINATE Pivotal', phase: 'Phase III', sponsor: 'Abbott', condition: 'Severe Tricuspid Regurgitation TEER', eligiblePatients: 38, status: 'Active' },
      { trialName: 'PARTNER 3 LTR', phase: 'Phase III', sponsor: 'Edwards', condition: 'Low-Risk TAVR Long-Term Outcomes', eligiblePatients: 142, status: 'Active' },
      { trialName: 'CLASP IID/IIF', phase: 'Phase III', sponsor: 'Edwards', condition: 'Transcatheter Mitral Valve Repair', eligiblePatients: 56, status: 'Recruiting' },
    ],
    registryEligibility: [
      { registryName: 'STS/ACC TVT Registry', registryBody: 'STS/ACC', eligiblePatients: 280, description: 'Transcatheter valve therapy outcomes including TAVR and mitral interventions' },
      { registryName: 'NCDR LAAO Registry', registryBody: 'ACC', eligiblePatients: 112, description: 'Left atrial appendage occlusion outcomes for structural heart procedures' },
    ],
  },
  coronary: {
    moduleId: 'coronary',
    procedures: [
      { name: 'PCI w Drug-Eluting Stent', cptCode: '92928', volume: 680, reimbursement: 42600, averageCost: 18400, margin: 56.8 },
      { name: 'CABG', cptCode: '33533-33536', volume: 120, reimbursement: 198400, averageCost: 142000, margin: 28.4 },
      { name: 'Diagnostic Catheterization', cptCode: '93458/93459', volume: 1420, reimbursement: 8200, averageCost: 3200, margin: 61.0 },
      { name: 'FFR/iFR Assessment', cptCode: '93571', volume: 340, reimbursement: 12800, averageCost: 4600, margin: 64.1 },
      { name: 'IVUS/OCT Imaging', cptCode: '92978', volume: 280, reimbursement: 6400, averageCost: 2800, margin: 56.3 },
      { name: 'Rotational Atherectomy', cptCode: '92924', volume: 86, reimbursement: 38200, averageCost: 18600, margin: 51.3 },
      { name: 'CTO PCI', cptCode: '92943', volume: 42, reimbursement: 52400, averageCost: 28400, margin: 45.8 },
      { name: 'IABP/Impella Support', cptCode: '33967/33990', volume: 64, reimbursement: 86200, averageCost: 52000, margin: 39.7 },
    ],
    drgs: [
      { code: '246', name: 'PCI w DES w MCC', category: 'PCI', cases: 420, reimbursement: 28500, cost: 24200, margin: 15.1, varianceVsBenchmark: 2400, avgLOS: 3.2, minLOS: 1.4, maxLOS: 8.6, avgCost: 24200, minCost: 14000, maxCost: 48000 },
      { code: '247', name: 'PCI w DES w/o MCC', category: 'PCI', cases: 680, reimbursement: 22100, cost: 18000, margin: 18.6, varianceVsBenchmark: 4200, avgLOS: 2.1, minLOS: 0.8, maxLOS: 5.4, avgCost: 18000, minCost: 10000, maxCost: 34000 },
      { code: '248', name: 'PCI w/o DES w MCC', category: 'PCI', cases: 86, reimbursement: 24800, cost: 18600, margin: 25.0, varianceVsBenchmark: 3600, avgLOS: 2.8, minLOS: 1.2, maxLOS: 7.2, avgCost: 18600, minCost: 11000, maxCost: 36000 },
      { code: '233', name: 'CABG w Cath w MCC', category: 'CABG', cases: 48, reimbursement: 68400, cost: 62200, margin: 9.1, varianceVsBenchmark: -8400, avgLOS: 12.1, minLOS: 6.8, maxLOS: 28.4, avgCost: 62200, minCost: 42000, maxCost: 118000 },
      { code: '234', name: 'CABG w Cath w CC', category: 'CABG', cases: 52, reimbursement: 52800, cost: 42000, margin: 20.5, varianceVsBenchmark: 4800, avgLOS: 8.4, minLOS: 5.2, maxLOS: 18.6, avgCost: 42000, minCost: 28000, maxCost: 78000 },
      { code: '235', name: 'CABG w/o Cath', category: 'CABG', cases: 20, reimbursement: 42600, cost: 32400, margin: 23.9, varianceVsBenchmark: 6200, avgLOS: 7.2, minLOS: 4.6, maxLOS: 16.2, avgCost: 32400, minCost: 22000, maxCost: 62000 },
      { code: '280', name: 'AMI w PCI w MCC', category: 'AMI', cases: 180, reimbursement: 32400, cost: 28800, margin: 11.1, varianceVsBenchmark: -1800, avgLOS: 4.6, minLOS: 2.0, maxLOS: 12.8, avgCost: 28800, minCost: 16000, maxCost: 56000 },
      { code: '281', name: 'AMI w PCI w/o MCC', category: 'AMI', cases: 240, reimbursement: 24200, cost: 18400, margin: 24.0, varianceVsBenchmark: 3200, avgLOS: 3.2, minLOS: 1.4, maxLOS: 8.2, avgCost: 18400, minCost: 10000, maxCost: 38000 },
    ],
    losRange: [
      { drg: 'PCI w MCC', avgLOS: 3.2, minLOS: 1.4, maxLOS: 8.6 },
      { drg: 'PCI w/o MCC', avgLOS: 2.1, minLOS: 0.8, maxLOS: 5.4 },
      { drg: 'PCI w/o DES', avgLOS: 2.8, minLOS: 1.2, maxLOS: 7.2 },
      { drg: 'CABG w MCC', avgLOS: 12.1, minLOS: 6.8, maxLOS: 28.4 },
      { drg: 'CABG w CC', avgLOS: 8.4, minLOS: 5.2, maxLOS: 18.6 },
      { drg: 'CABG w/o Cath', avgLOS: 7.2, minLOS: 4.6, maxLOS: 16.2 },
      { drg: 'AMI w MCC', avgLOS: 4.6, minLOS: 2.0, maxLOS: 12.8 },
      { drg: 'AMI w/o MCC', avgLOS: 3.2, minLOS: 1.4, maxLOS: 8.2 },
    ],
    costRange: [
      { drg: 'PCI w MCC', avgCost: 24200, minCost: 14000, maxCost: 48000 },
      { drg: 'PCI w/o MCC', avgCost: 18000, minCost: 10000, maxCost: 34000 },
      { drg: 'PCI w/o DES', avgCost: 18600, minCost: 11000, maxCost: 36000 },
      { drg: 'CABG w MCC', avgCost: 62200, minCost: 42000, maxCost: 118000 },
      { drg: 'CABG w CC', avgCost: 42000, minCost: 28000, maxCost: 78000 },
      { drg: 'CABG w/o Cath', avgCost: 32400, minCost: 22000, maxCost: 62000 },
      { drg: 'AMI w MCC', avgCost: 28800, minCost: 16000, maxCost: 56000 },
      { drg: 'AMI w/o MCC', avgCost: 18400, minCost: 10000, maxCost: 38000 },
    ],
    trialEligibility: [
      { trialName: 'SELECT-CABG', phase: 'Phase II', sponsor: 'AstraZeneca', condition: 'SGLT2i Perioperative Cardioprotection', eligiblePatients: 120, status: 'Recruiting' },
      { trialName: 'ISCHEMIA-EXTEND', phase: 'Phase IV', sponsor: 'NYU Langone', condition: 'Stable Ischemic Heart Disease Outcomes', eligiblePatients: 680, status: 'Active' },
      { trialName: 'FAME 3', phase: 'Phase III', sponsor: 'Medtronic', condition: 'FFR-Guided CABG vs PCI in 3-Vessel Disease', eligiblePatients: 86, status: 'Active' },
      { trialName: 'ORBITA-2', phase: 'Phase III', sponsor: 'Imperial College London', condition: 'PCI vs Placebo for Stable Angina', eligiblePatients: 420, status: 'Completed' },
    ],
    registryEligibility: [
      { registryName: 'ACC NCDR CathPCI', registryBody: 'ACC', eligiblePatients: 2520, description: 'National catheterization and PCI quality outcomes tracking' },
      { registryName: 'STS Adult Cardiac Surgery', registryBody: 'STS', eligiblePatients: 120, description: 'Society of Thoracic Surgeons CABG and cardiac surgery outcomes' },
      { registryName: 'NCDR Chest Pain-MI', registryBody: 'ACC', eligiblePatients: 420, description: 'Acute MI care pathway and outcomes registry' },
    ],
  },
  valvular: {
    moduleId: 'valvular',
    procedures: [
      { name: 'Surgical AVR', cptCode: '33405', volume: 86, reimbursement: 198400, averageCost: 142000, margin: 28.4 },
      { name: 'Mitral Valve Repair', cptCode: '33425/33426', volume: 52, reimbursement: 178600, averageCost: 124000, margin: 30.6 },
      { name: 'TAVR', cptCode: '33361/33362', volume: 124, reimbursement: 168500, averageCost: 82400, margin: 51.1 },
      { name: 'Transcatheter MitraClip', cptCode: '33418', volume: 48, reimbursement: 142800, averageCost: 68400, margin: 52.1 },
      { name: 'Tricuspid Repair', cptCode: '33463/33464', volume: 22, reimbursement: 156200, averageCost: 98000, margin: 37.3 },
      { name: 'Ross Procedure', cptCode: '33413', volume: 8, reimbursement: 224000, averageCost: 168000, margin: 25.0 },
      { name: 'Valve-in-Valve TAVR', cptCode: '33361', volume: 18, reimbursement: 172400, averageCost: 86000, margin: 50.1 },
      { name: 'Annuloplasty Ring', cptCode: '33427', volume: 42, reimbursement: 142600, averageCost: 92000, margin: 35.5 },
    ],
    drgs: [
      { code: '216', name: 'Valve w/o Cath w MCC', category: 'Surgical', cases: 68, reimbursement: 52300, cost: 48800, margin: 6.7, varianceVsBenchmark: -5200, avgLOS: 8.8, minLOS: 4.6, maxLOS: 24.2, avgCost: 48800, minCost: 32000, maxCost: 92000 },
      { code: '217', name: 'Valve w/o Cath w CC', category: 'Surgical', cases: 86, reimbursement: 38400, cost: 28200, margin: 26.6, varianceVsBenchmark: 5400, avgLOS: 6.2, minLOS: 3.4, maxLOS: 16.8, avgCost: 28200, minCost: 18000, maxCost: 54000 },
      { code: '218', name: 'Valve w/o Cath w/o CC', category: 'Surgical', cases: 42, reimbursement: 28600, cost: 18400, margin: 35.7, varianceVsBenchmark: 8200, avgLOS: 4.4, minLOS: 2.8, maxLOS: 10.6, avgCost: 18400, minCost: 12000, maxCost: 34000 },
      { code: '219', name: 'TAVR', category: 'Transcatheter', cases: 124, reimbursement: 168500, cost: 82400, margin: 51.1, varianceVsBenchmark: 32000, avgLOS: 3.6, minLOS: 1.2, maxLOS: 11.8, avgCost: 82400, minCost: 60000, maxCost: 132000 },
      { code: '220', name: 'TEER (MitraClip)', category: 'Transcatheter', cases: 48, reimbursement: 142800, cost: 68400, margin: 52.1, varianceVsBenchmark: 24800, avgLOS: 2.4, minLOS: 1.0, maxLOS: 7.6, avgCost: 68400, minCost: 46000, maxCost: 104000 },
      { code: '221', name: 'Tricuspid Repair', category: 'Surgical', cases: 22, reimbursement: 156200, cost: 98000, margin: 37.3, varianceVsBenchmark: 12400, avgLOS: 9.4, minLOS: 5.2, maxLOS: 22.4, avgCost: 98000, minCost: 68000, maxCost: 156000 },
      { code: '215', name: 'Valve w Cath w MCC', category: 'Complex', cases: 34, reimbursement: 62400, cost: 56800, margin: 9.0, varianceVsBenchmark: -6200, avgLOS: 10.2, minLOS: 5.8, maxLOS: 26.4, avgCost: 56800, minCost: 38000, maxCost: 98000 },
      { code: '236', name: 'Valve-in-Valve', category: 'Transcatheter', cases: 18, reimbursement: 172400, cost: 86000, margin: 50.1, varianceVsBenchmark: 28000, avgLOS: 3.2, minLOS: 1.4, maxLOS: 8.8, avgCost: 86000, minCost: 62000, maxCost: 124000 },
    ],
    losRange: [
      { drg: 'Valve w MCC', avgLOS: 8.8, minLOS: 4.6, maxLOS: 24.2 },
      { drg: 'Valve w CC', avgLOS: 6.2, minLOS: 3.4, maxLOS: 16.8 },
      { drg: 'Valve w/o CC', avgLOS: 4.4, minLOS: 2.8, maxLOS: 10.6 },
      { drg: 'TAVR', avgLOS: 3.6, minLOS: 1.2, maxLOS: 11.8 },
      { drg: 'TEER', avgLOS: 2.4, minLOS: 1.0, maxLOS: 7.6 },
      { drg: 'Tricuspid', avgLOS: 9.4, minLOS: 5.2, maxLOS: 22.4 },
      { drg: 'Valve w Cath', avgLOS: 10.2, minLOS: 5.8, maxLOS: 26.4 },
      { drg: 'Valve-in-Valve', avgLOS: 3.2, minLOS: 1.4, maxLOS: 8.8 },
    ],
    costRange: [
      { drg: 'Valve w MCC', avgCost: 48800, minCost: 32000, maxCost: 92000 },
      { drg: 'Valve w CC', avgCost: 28200, minCost: 18000, maxCost: 54000 },
      { drg: 'Valve w/o CC', avgCost: 18400, minCost: 12000, maxCost: 34000 },
      { drg: 'TAVR', avgCost: 82400, minCost: 60000, maxCost: 132000 },
      { drg: 'TEER', avgCost: 68400, minCost: 46000, maxCost: 104000 },
      { drg: 'Tricuspid', avgCost: 98000, minCost: 68000, maxCost: 156000 },
      { drg: 'Valve w Cath', avgCost: 56800, minCost: 38000, maxCost: 98000 },
      { drg: 'Valve-in-Valve', avgCost: 86000, minCost: 62000, maxCost: 124000 },
    ],
    trialEligibility: [
      { trialName: 'EARLY-TAVR', phase: 'Phase III', sponsor: 'Edwards', condition: 'Asymptomatic Severe Aortic Stenosis', eligiblePatients: 86, status: 'Active' },
      { trialName: 'RHEIA', phase: 'Phase III', sponsor: 'Medtronic', condition: 'Women-Specific TAVR Outcomes', eligiblePatients: 42, status: 'Recruiting' },
      { trialName: 'EXPAND TAVR II', phase: 'Phase IV', sponsor: 'Medtronic', condition: 'Evolut PRO+ Post-Market Surveillance', eligiblePatients: 124, status: 'Active' },
    ],
    registryEligibility: [
      { registryName: 'STS Adult Cardiac Surgery', registryBody: 'STS', eligiblePatients: 234, description: 'Surgical valve repair/replacement quality outcomes tracking' },
      { registryName: 'STS/ACC TVT Registry', registryBody: 'STS/ACC', eligiblePatients: 190, description: 'Transcatheter valve therapy including TAVR and TEER outcomes' },
    ],
  },
  pv: {
    moduleId: 'pv',
    procedures: [
      { name: 'Lower Extremity Revascularization', cptCode: '37224-37227', volume: 280, reimbursement: 32400, averageCost: 14200, margin: 56.2 },
      { name: 'Atherectomy', cptCode: '37225', volume: 186, reimbursement: 28600, averageCost: 12800, margin: 55.2 },
      { name: 'Carotid Artery Stenting', cptCode: '37215/37216', volume: 64, reimbursement: 42800, averageCost: 22400, margin: 47.7 },
      { name: 'Carotid Endarterectomy', cptCode: '35301', volume: 86, reimbursement: 38400, averageCost: 18600, margin: 51.6 },
      { name: 'Aortic Stent Graft (EVAR)', cptCode: '34802-34805', volume: 42, reimbursement: 86200, averageCost: 52000, margin: 39.7 },
      { name: 'Thoracic Endovascular (TEVAR)', cptCode: '33880/33881', volume: 18, reimbursement: 124600, averageCost: 78000, margin: 37.4 },
      { name: 'Dialysis Access Creation', cptCode: '36818-36821', volume: 124, reimbursement: 18400, averageCost: 8200, margin: 55.4 },
      { name: 'Venous Ablation', cptCode: '36473/36474', volume: 198, reimbursement: 8600, averageCost: 3400, margin: 60.5 },
    ],
    drgs: [
      { code: '252', name: 'Peripheral Vasc w MCC', category: 'Lower Extremity', cases: 142, reimbursement: 32400, cost: 28200, margin: 13.0, varianceVsBenchmark: -2400, avgLOS: 5.6, minLOS: 2.4, maxLOS: 14.2, avgCost: 28200, minCost: 16000, maxCost: 52000 },
      { code: '253', name: 'Peripheral Vasc w CC', category: 'Lower Extremity', cases: 186, reimbursement: 24200, cost: 16800, margin: 30.6, varianceVsBenchmark: 4200, avgLOS: 3.4, minLOS: 1.6, maxLOS: 8.8, avgCost: 16800, minCost: 9000, maxCost: 32000 },
      { code: '254', name: 'Peripheral Vasc w/o CC', category: 'Lower Extremity', cases: 98, reimbursement: 18600, cost: 10400, margin: 44.1, varianceVsBenchmark: 6800, avgLOS: 2.2, minLOS: 0.8, maxLOS: 5.4, avgCost: 10400, minCost: 6000, maxCost: 22000 },
      { code: '270', name: 'Carotid w MCC', category: 'Carotid', cases: 28, reimbursement: 42800, cost: 36200, margin: 15.4, varianceVsBenchmark: 1800, avgLOS: 4.8, minLOS: 2.2, maxLOS: 12.4, avgCost: 36200, minCost: 22000, maxCost: 64000 },
      { code: '271', name: 'Carotid w/o MCC', category: 'Carotid', cases: 122, reimbursement: 32600, cost: 18600, margin: 42.9, varianceVsBenchmark: 8400, avgLOS: 2.4, minLOS: 1.0, maxLOS: 6.2, avgCost: 18600, minCost: 10000, maxCost: 34000 },
      { code: '237', name: 'EVAR', category: 'Aortic', cases: 42, reimbursement: 86200, cost: 52000, margin: 39.7, varianceVsBenchmark: 14200, avgLOS: 4.2, minLOS: 2.0, maxLOS: 11.6, avgCost: 52000, minCost: 34000, maxCost: 86000 },
      { code: '238', name: 'TEVAR', category: 'Aortic', cases: 18, reimbursement: 124600, cost: 78000, margin: 37.4, varianceVsBenchmark: 18400, avgLOS: 6.4, minLOS: 3.2, maxLOS: 16.8, avgCost: 78000, minCost: 52000, maxCost: 128000 },
      { code: '673', name: 'Dialysis Access', category: 'Access', cases: 124, reimbursement: 18400, cost: 8200, margin: 55.4, varianceVsBenchmark: 4200, avgLOS: 1.4, minLOS: 0.6, maxLOS: 3.2, avgCost: 8200, minCost: 5000, maxCost: 14000 },
    ],
    losRange: [
      { drg: 'PV w MCC', avgLOS: 5.6, minLOS: 2.4, maxLOS: 14.2 },
      { drg: 'PV w CC', avgLOS: 3.4, minLOS: 1.6, maxLOS: 8.8 },
      { drg: 'PV w/o CC', avgLOS: 2.2, minLOS: 0.8, maxLOS: 5.4 },
      { drg: 'Carotid w MCC', avgLOS: 4.8, minLOS: 2.2, maxLOS: 12.4 },
      { drg: 'Carotid w/o', avgLOS: 2.4, minLOS: 1.0, maxLOS: 6.2 },
      { drg: 'EVAR', avgLOS: 4.2, minLOS: 2.0, maxLOS: 11.6 },
      { drg: 'TEVAR', avgLOS: 6.4, minLOS: 3.2, maxLOS: 16.8 },
      { drg: 'Dialysis', avgLOS: 1.4, minLOS: 0.6, maxLOS: 3.2 },
    ],
    costRange: [
      { drg: 'PV w MCC', avgCost: 28200, minCost: 16000, maxCost: 52000 },
      { drg: 'PV w CC', avgCost: 16800, minCost: 9000, maxCost: 32000 },
      { drg: 'PV w/o CC', avgCost: 10400, minCost: 6000, maxCost: 22000 },
      { drg: 'Carotid w MCC', avgCost: 36200, minCost: 22000, maxCost: 64000 },
      { drg: 'Carotid w/o', avgCost: 18600, minCost: 10000, maxCost: 34000 },
      { drg: 'EVAR', avgCost: 52000, minCost: 34000, maxCost: 86000 },
      { drg: 'TEVAR', avgCost: 78000, minCost: 52000, maxCost: 128000 },
      { drg: 'Dialysis', avgCost: 8200, minCost: 5000, maxCost: 14000 },
    ],
    trialEligibility: [
      { trialName: 'VOYAGER-PAD Extension', phase: 'Phase IV', sponsor: 'Bayer/Janssen', condition: 'Rivaroxaban in PAD Post-Revascularization', eligiblePatients: 280, status: 'Active' },
      { trialName: 'BEST-CLI', phase: 'Phase III', sponsor: 'NHLBI', condition: 'Endovascular vs Surgical for CLTI', eligiblePatients: 142, status: 'Active' },
      { trialName: 'BASIL-3', phase: 'Phase III', sponsor: 'Univ of Birmingham', condition: 'Drug-Eluting vs Plain Balloon for CLTI', eligiblePatients: 98, status: 'Recruiting' },
    ],
    registryEligibility: [
      { registryName: 'VQI (Vascular Quality Initiative)', registryBody: 'SVS', eligiblePatients: 920, description: 'Society for Vascular Surgery quality improvement and outcomes' },
      { registryName: 'SVS PSO Registry', registryBody: 'SVS', eligiblePatients: 586, description: 'Patient Safety Organization for vascular procedures' },
    ],
  },
};
