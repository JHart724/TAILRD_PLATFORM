export interface KPIItem {
  label: string;
  stateAValue: number;  // CMS estimate
  stateBValue: number;  // Verified after upload
  trend: { direction: 'up' | 'down'; value: string };
  unit: 'currency' | 'number' | 'percent';
  icon: string;  // lucide-react icon name
}

export interface BenchmarkCard {
  metric: string;
  stateAValue: number;
  stateBValue: number;
  nationalAvg: number;
  topDecile: number;
  unit: 'percent' | 'number' | 'currency' | 'days' | 'ratio';
  status: 'above' | 'at' | 'below';
}

export interface ModuleTile {
  id: string;
  name: string;
  icon: string;
  patients: number;
  procedures: number;
  revenue: number;
  qualityScore: number;
}

export interface Opportunity {
  title: string;
  impact: string;
  category: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CareGapFunnel {
  title: string;
  stages: { label: string; value: number; percentage: number }[];
}

export interface DRGRow {
  code: string;
  description: string;
  volume: number;
  avgLOS: number;
  reimbursement: number;
  margin: number;
}

export interface DataSourceInfo {
  name: string;
  type: string;
  description: string;
  lastUpdated: string;
  coverage: string;
  iconColor: string;
}

export interface TrialEntry {
  title: string;
  phase: string;
  sponsor: string;
  condition: string;
  status: 'Recruiting' | 'Active' | 'Completed';
}

export interface BenchmarkPosition {
  metric: string;
  value: number;
  min: number;
  max: number;
  nationalAvg: number;
  unit: string;
  lowerIsBetter?: boolean;
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

export interface FinancialSummary {
  label: string;
  stateAValue: number;
  stateBValue: number;
  unit: 'currency' | 'percent';
  trend: { direction: 'up' | 'down'; value: string };
}

export interface MarginOpportunity {
  title: string;
  currentMargin: number;
  targetMargin: number;
  potentialUplift: number;
}

export interface PopulationStat {
  label: string;
  stateAValue: number;
  stateBValue: number;
  unit: 'number' | 'percent';
  icon: string;
  trend?: { direction: 'up' | 'down'; value: string };
}

// ─── Per-Module Detail Panel Types ────────────────────────────

export interface ModuleProcedure {
  name: string;
  cptCode: string;
  volume: number;
  reimbursement: number;
  averageCost: number;
  margin: number;
}

export interface ModuleDRG {
  code: string;
  name: string;
  category: string;
  cases: number;
  reimbursement: number;
  cost: number;
  margin: number;
  varianceVsBenchmark: number;
  avgLOS: number;
  minLOS: number;
  maxLOS: number;
  avgCost: number;
  minCost: number;
  maxCost: number;
}

export interface LOSRangePoint {
  drg: string;
  avgLOS: number;
  minLOS: number;
  maxLOS: number;
}

export interface CostRangePoint {
  drg: string;
  avgCost: number;
  minCost: number;
  maxCost: number;
}

export interface TrialEligibility {
  trialName: string;
  phase: string;
  sponsor: string;
  condition: string;
  eligiblePatients: number;
  status: 'Recruiting' | 'Active' | 'Completed';
}

export interface RegistryEligibility {
  registryName: string;
  registryBody: string;
  eligiblePatients: number;
  description: string;
}

export interface ModuleDetailData {
  moduleId: string;
  procedures: ModuleProcedure[];
  drgs: ModuleDRG[];
  losRange: LOSRangePoint[];
  costRange: CostRangePoint[];
  trialEligibility: TrialEligibility[];
  registryEligibility: RegistryEligibility[];
}
