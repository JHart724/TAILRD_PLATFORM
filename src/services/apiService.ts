/**
 * API Service for TAILRD Platform
 * Centralized service for backend API calls
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
  timestamp: string;
}

export interface PatientData {
  id: string;
  name: string;
  mrn: string;
  age: number;
  ef: number;
  nyhaClass: string;
  gdmtScore: number;
  careGaps: string[];
  lastVisit: string;
  nextVisit: string;
  risk: 'low' | 'medium' | 'high';
}

export interface GDMTRecommendations {
  patientId: string;
  recommendations: {
 aceArb: {
 recommended: boolean;
 currentDose: number;
 targetDose: number;
 reasoning: string;
 };
 betaBlocker: {
 recommended: boolean;
 currentDose: number;
 targetDose: number;
 reasoning: string;
 };
 mra: {
 recommended: boolean;
 currentDose: number;
 targetDose: number;
 reasoning: string;
 };
 sglt2i: {
 recommended: boolean;
 currentDose: number;
 targetDose: number;
 reasoning: string;
 };
  };
  overallOptimization: number;
  timestamp: string;
}

export interface CHA2DS2VAScResult {
  patientId: string;
  score: number;
  riskLevel: string;
  annualStrokeRisk: string;
  recommendation: string;
  components: {
 congestiveHF: number;
 hypertension: number;
 age: number;
 diabetes: number;
 stroke: number;
 vascular: number;
 sex: number;
  };
  automated: boolean;
  dataSource: string;
  timestamp: string;
}

export interface HASBLEDResult {
  patientId: string;
  score: number;
  riskLevel: string;
  annualBleedingRisk: string;
  recommendation: string;
  components: {
 hypertension: number;
 abnormalRenalLiver: number;
 stroke: number;
 bleeding: number;
 labilINR: number;
 elderly: number;
 drugs: number;
 alcohol: number;
  };
  automated: boolean;
  dataSource: string;
  timestamp: string;
}

export interface STSRiskResult {
  patientId: string;
  predictedMortality: number;
  riskCategory: string;
  recommendation: string;
  components: {
 age: number;
 sex: string;
 ef: number;
 creatinine: number;
 diabetes: boolean;
 chronicLung: boolean;
 previousCV: boolean;
 nyhaClass: number;
  };
  automated: boolean;
  dataSource: string;
  version: string;
  timestamp: string;
}

class APIService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<APIResponse<T>> {
 try {
 const response = await fetch(`${API_BASE_URL}${endpoint}`, {
 headers: {
 'Content-Type': 'application/json',
 ...options?.headers,
 },
 ...options,
 });

 const data: APIResponse<T> = await response.json();
 
 if (!response.ok) {
 throw new Error(data.error || `HTTP error! status: ${response.status}`);
 }

 return data;
 } catch (error) {
 console.error(`API request failed for ${endpoint}:`, error);
 throw error;
 }
  }

  // Modules API
  async getModules() {
 return this.request('/modules');
  }

  // Heart Failure API
  async getHeartFailureDashboard() {
 return this.request('/modules/heart-failure/dashboard');
  }

  async getHeartFailurePatients(): Promise<APIResponse<PatientData[]>> {
 return this.request<PatientData[]>('/modules/heart-failure/patients');
  }

  async calculateGDMT(patientData: Record<string, unknown>): Promise<APIResponse<GDMTRecommendations>> {
 return this.request<GDMTRecommendations>('/modules/heart-failure/gdmt-calculator', {
 method: 'POST',
 body: JSON.stringify({ patientData }),
 });
  }

  // Advanced Heart Failure APIs
  async getGDMTGapAnalysis(populationFilters?: Record<string, unknown>) {
 return this.request('/modules/heart-failure/gdmt-gaps', {
 method: 'POST',
 body: JSON.stringify({ populationFilters: populationFilters || {} }),
 });
  }

  async analyzePhenotype(patientData: Record<string, unknown>) {
 return this.request('/modules/heart-failure/phenotype-analysis', {
 method: 'POST',
 body: JSON.stringify({ patientData }),
 });
  }

  async assessDeviceEligibility(patientData: Record<string, unknown>) {
 return this.request('/modules/heart-failure/device-eligibility', {
 method: 'POST',
 body: JSON.stringify({ patientData }),
 });
  }

  // Automated calculators - these pull data automatically from EHR/backend
  async getAutomatedCHA2DS2VASc(patientId: string): Promise<APIResponse<CHA2DS2VAScResult>> {
 return this.request<CHA2DS2VAScResult>(`/calculators/cha2ds2-vasc/${patientId}`);
  }

  async getAutomatedHASBLED(patientId: string): Promise<APIResponse<HASBLEDResult>> {
 return this.request<HASBLEDResult>(`/calculators/has-bled/${patientId}`);
  }

  async getAutomatedSTSRisk(patientId: string): Promise<APIResponse<STSRiskResult>> {
 return this.request<STSRiskResult>(`/calculators/sts-risk/${patientId}`);
  }

  // Clinical workflows
  async initiateCareWorkflow(workflowType: string, patientId: string, config?: Record<string, unknown>) {
 return this.request('/workflows/initiate', {
 method: 'POST',
 body: JSON.stringify({ workflowType, patientId, config }),
 });
  }

  async generateClinicalReport(reportType: string, parameters?: Record<string, unknown>) {
 return this.request('/reports/generate', {
 method: 'POST',
 body: JSON.stringify({ reportType, parameters }),
 });
  }

  // Export functionality
  async exportData(dataType: string, format: 'csv' | 'excel' | 'pdf', filters?: Record<string, unknown>) {
 return this.request('/export', {
 method: 'POST',
 body: JSON.stringify({ dataType, format, filters }),
 });
  }

  // Advanced Electrophysiology APIs
  async predictAblationSuccess(patientData: Record<string, unknown>) {
 return this.request('/modules/electrophysiology/ablation-predictor', {
 method: 'POST',
 body: JSON.stringify({ patientData }),
 });
  }

  async recommendLAACDevice(patientData: Record<string, unknown>) {
 return this.request('/modules/electrophysiology/laac-device-selection', {
 method: 'POST',
 body: JSON.stringify({ patientData }),
 });
  }

  async getAnticoagulationDecision(patientData: Record<string, unknown>) {
 return this.request('/modules/electrophysiology/anticoagulation-decision', {
 method: 'POST',
 body: JSON.stringify({ patientData }),
 });
  }

  // ============================================
  // Clinical Intelligence API (Group B)
  // ============================================

  // Risk Score Assessments
  async getRiskScores(patientId: string, module?: string, scoreType?: string) {
 const params = new URLSearchParams();
 if (module) params.set('module', module);
 if (scoreType) params.set('scoreType', scoreType);
 const qs = params.toString() ? `?${params}` : '';
 return this.request(`/clinical/risk-scores/${patientId}${qs}`);
  }

  async createRiskScore(data: Record<string, unknown>) {
 return this.request('/clinical/risk-scores', {
 method: 'POST',
 body: JSON.stringify(data),
 });
  }

  async getRiskScoreSummary(hospitalId: string, module?: string) {
 const qs = module ? `?module=${module}` : '';
 return this.request(`/clinical/risk-scores/summary/${hospitalId}${qs}`);
  }

  // Intervention Tracking
  async getInterventions(patientId: string, module?: string, status?: string) {
 const params = new URLSearchParams();
 if (module) params.set('module', module);
 if (status) params.set('status', status);
 const qs = params.toString() ? `?${params}` : '';
 return this.request(`/clinical/interventions/${patientId}${qs}`);
  }

  async createIntervention(data: Record<string, unknown>) {
 return this.request('/clinical/interventions', {
 method: 'POST',
 body: JSON.stringify(data),
 });
  }

  async updateInterventionStatus(id: string, data: { status: string; outcome?: string; completedAt?: string }) {
 return this.request(`/clinical/interventions/${id}/status`, {
 method: 'PATCH',
 body: JSON.stringify(data),
 });
  }

  async getInterventionSummary(hospitalId: string, module?: string) {
 const qs = module ? `?module=${module}` : '';
 return this.request(`/clinical/interventions/summary/${hospitalId}${qs}`);
  }

  // Contraindication Assessments
  async getContraindications(patientId: string, module?: string, level?: string) {
 const params = new URLSearchParams();
 if (module) params.set('module', module);
 if (level) params.set('level', level);
 const qs = params.toString() ? `?${params}` : '';
 return this.request(`/clinical/contraindications/${patientId}${qs}`);
  }

  async createContraindication(data: Record<string, unknown>) {
 return this.request('/clinical/contraindications', {
 method: 'POST',
 body: JSON.stringify(data),
 });
  }

  async overrideContraindication(id: string, overriddenBy: string, overrideReason: string) {
 return this.request(`/clinical/contraindications/${id}/override`, {
 method: 'PATCH',
 body: JSON.stringify({ overriddenBy, overrideReason }),
 });
  }

  async getContraindicationSummary(hospitalId: string, module?: string) {
 const qs = module ? `?module=${module}` : '';
 return this.request(`/clinical/contraindications/summary/${hospitalId}${qs}`);
  }

  // Drug Titrations (cross-module)
  async getDrugTitrations(patientId: string, module?: string) {
 const qs = module ? `?module=${module}` : '';
 return this.request(`/clinical/drug-titrations/${patientId}${qs}`);
  }
}

export const apiService = new APIService();
export default apiService;
