// Shared interfaces for cross-module standardization

// Standard Executive Metric Interface
export interface StandardExecutiveMetric {
  label: string;
  value: string;
  subvalue?: string;
  trend?: {
    direction: 'up' | 'down';
    value: string;
    label: string;
  };
  status?: 'optimal' | 'warning' | 'critical';
  icon: React.ElementType;
}

// Standard Care Team Tab Types
export type StandardCareTeamTab = 
  | 'dashboard'      // Module-specific overview/alerts
  | 'patients'       // Patient census and management
  | 'workflow'       // Module-specific clinical workflows
  | 'safety'         // Safety alerts and quality metrics
  | 'team'           // Team coordination and schedules
  | 'documentation'; // CDI and clinical documentation

// Standard Patient Base Interface
export interface StandardPatientBase {
  id: string;
  name: string;
  mrn: string;
  age: number;
  gender: 'M' | 'F';
  provider: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  alerts: string[];
  priority: 'low' | 'medium' | 'high';
}

// Standard Alert Interface
export interface StandardAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  patientId?: string;
  patientName?: string;
}

// Standard Task Interface
export interface StandardTask {
  id: string;
  type: string;
  patient: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  status: 'pending' | 'in-progress' | 'completed';
}

// Standard KPI Data Interface
export interface StandardKPIData {
  total: number;
  high: number;
  medium: number;
  low: number;
  completed: number;
  pending: number;
  critical: number;
}

// Standard Modal State Interface
export interface StandardModalState {
  showPatientDetail: boolean;
  showClinicalDetail: boolean;
  showWorkflowDetail: boolean;
  showSafetyDetail: boolean;
  showTeamDetail: boolean;
  showDocumentationDetail: boolean;
  selectedPatient: any | null;
}

// Standard Tab Configuration for Care Team Views
export interface StandardTabConfig {
  id: StandardCareTeamTab;
  label: string;
  icon: React.ElementType;
  description?: string;
}

// Service Line Tab Configuration (more flexible for service line specific tabs)
export interface ServiceLineTabConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  description?: string;
}

// Standard Filter State
export interface StandardFilterState {
  searchTerm: string;
  riskLevel: 'all' | 'low' | 'medium' | 'high' | 'critical';
  status: 'all' | string;
  provider: 'all' | string;
  specialty: 'all' | string;
}