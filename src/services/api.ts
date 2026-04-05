/**
 * Central API Client for TAILRD Platform
 * Typed fetch-based functions matching 145 Express backend endpoints.
 */

import { DATA_SOURCE } from '../config/dataSource';

// ─── Response Types ─────────────────────────────────────────────────────────

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      title?: string;
      role: string;
      department?: string;
      hospitalId?: string;
      hospitalName?: string;
      permissions?: Record<string, boolean>;
    };
    token: string;
    refreshToken: string;
    permissions?: Record<string, boolean>;
  };
}

export interface UserResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface TokenResponse {
  success: boolean;
  data: {
    token: string;
  };
}

export interface ClinicalGap {
  id: string;
  name: string;
  description: string;
  patientCount: number;
  dollarOpportunity: number;
  gapType: string;
  priority: string;
  module: string;
  evidence?: string;
  cta?: string;
  whyMissed?: string;
  detectionCriteria?: string[];
  category?: string;
  tag?: string;
  safetyNote?: string;
  whyTailrd?: string;
  methodologyNote?: string;
  diagnosticOpportunity?: number;
  pharmaceuticalOpportunity?: number;
  subcategories?: { label: string; count: number }[];
}

export interface GapPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  signals: string[];
  keyValues: Record<string, string | number>;
  tier?: string;
}

export interface GapSummary {
  moduleId: string;
  totalGaps: number;
  totalPatients: number;
  totalOpportunity: number;
  gapsByType: Record<string, number>;
}

export interface PlatformTotals {
  totalPatients: number;
  totalOpportunity: number;
  quarterlyActionable: number;
  modules: Record<string, { patients: number; opportunity: number; gaps: number }>;
}

export interface ModuleTotals {
  patients: number;
  opportunity: number;
  gaps: number;
}

export interface ExecutiveData {
  moduleId: string;
  metrics: Array<{
    label: string;
    value: string;
    subvalue?: string;
    trend?: { direction: 'up' | 'down'; value: string; label: string };
    status?: 'optimal' | 'warning' | 'critical';
  }>;
  charts: Array<Record<string, unknown>>;
  kpis: Record<string, unknown>;
}

export interface PatientFilters {
  riskLevel?: string;
  provider?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface Patient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  gender?: string;
  provider?: string;
  riskLevel?: string;
  alerts?: string[];
  priority?: string;
  module?: string;
}

export interface GapFlag {
  id: string;
  gapId: string;
  gapName: string;
  priority: string;
  status: string;
}

export interface RegistryCase {
  id: string;
  patientId: string;
  registryType: string;
  status: string;
  fields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TrialFilters {
  module?: string;
  status?: string;
  phase?: string;
}

export interface Trial {
  id: string;
  name: string;
  module: string;
  phase: string;
  status: string;
  eligibilityCriteria: string[];
  enrollmentTarget: number;
  currentEnrollment: number;
}

// ─── API Error ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ─── Base Fetch Helper ──────────────────────────────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('tailrd-session-token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${DATA_SOURCE.apiUrl}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err) {
    throw new ApiError('Network error: unable to reach API server', 0);
  }

  // Handle 401 — clear auth, redirect to login
  if (response.status === 401) {
    localStorage.removeItem('tailrd-session-token');
    localStorage.removeItem('tailrd-refresh-token');
    localStorage.removeItem('tailrd-user');
    window.location.href = '/login';
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  if (!response.ok) {
    let message = `API error: ${response.status}`;
    try {
      const errBody = await response.json();
      message = errBody.error || errBody.message || message;
    } catch {
      // response wasn't JSON
    }
    throw new ApiError(message, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const json = await response.json();
  // Backend wraps responses in { success, data, ... }
  return json.data !== undefined ? json.data : json;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${DATA_SOURCE.apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    let message = 'Login failed';
    try {
      const err = await response.json();
      message = err.message || err.error || message;
    } catch { /* ignore */ }
    throw new ApiError(message, response.status);
  }

  return response.json();
}

export async function logoutApi(): Promise<void> {
  await apiFetch<void>('/auth/logout', { method: 'POST' });
}

export async function verifyToken(): Promise<UserResponse> {
  return apiFetch<UserResponse>('/auth/verify');
}

export async function refreshTokenApi(): Promise<TokenResponse> {
  const refreshToken = localStorage.getItem('tailrd-refresh-token');
  return apiFetch<TokenResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

// ─── Gap Detection ──────────────────────────────────────────────────────────

export async function getModuleGaps(moduleId: string): Promise<ClinicalGap[]> {
  return apiFetch<ClinicalGap[]>(`/modules/${moduleId}/gaps`);
}

export async function getGapPatients(gapId: string): Promise<GapPatient[]> {
  return apiFetch<GapPatient[]>(`/gaps/${gapId}/patients`);
}

export async function getGapSummary(moduleId: string): Promise<GapSummary> {
  return apiFetch<GapSummary>(`/modules/${moduleId}/gaps/summary`);
}

export async function actionGap(gapId: string, patientId: string, action: string): Promise<void> {
  await apiFetch<void>(`/gaps/${gapId}/action`, {
    method: 'POST',
    body: JSON.stringify({ patientId, action }),
  });
}

// ─── Platform ───────────────────────────────────────────────────────────────

export async function getPlatformTotals(): Promise<PlatformTotals> {
  return apiFetch<PlatformTotals>('/platform/totals');
}

export async function getModuleTotals(moduleId: string): Promise<ModuleTotals> {
  return apiFetch<ModuleTotals>(`/modules/${moduleId}/totals`);
}

// ─── Executive ──────────────────────────────────────────────────────────────

export async function getExecutiveDashboard(moduleId: string): Promise<ExecutiveData> {
  return apiFetch<ExecutiveData>(`/modules/${moduleId}/executive`);
}

// ─── Patients ───────────────────────────────────────────────────────────────

export async function getPatients(moduleId: string, filters?: PatientFilters): Promise<Patient[]> {
  const params = new URLSearchParams();
  if (filters?.riskLevel) params.set('riskLevel', filters.riskLevel);
  if (filters?.provider) params.set('provider', filters.provider);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<Patient[]>(`/modules/${moduleId}/patients${qs}`);
}

export async function getPatient(patientId: string): Promise<Patient> {
  return apiFetch<Patient>(`/patients/${patientId}`);
}

export async function getPatientGaps(patientId: string): Promise<GapFlag[]> {
  return apiFetch<GapFlag[]>(`/patients/${patientId}/gaps`);
}

// ─── Registry ───────────────────────────────────────────────────────────────

export async function getRegistryCases(registryType: string): Promise<RegistryCase[]> {
  return apiFetch<RegistryCase[]>(`/registry/${registryType}/cases`);
}

export async function updateRegistryCase(caseId: string, fields: Record<string, any>): Promise<RegistryCase> {
  return apiFetch<RegistryCase>(`/registry/cases/${caseId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

export async function approveRegistryCase(caseId: string): Promise<void> {
  await apiFetch<void>(`/registry/cases/${caseId}/approve`, { method: 'POST' });
}

// ─── Trials ─────────────────────────────────────────────────────────────────

export async function getTrials(filters?: TrialFilters): Promise<Trial[]> {
  const params = new URLSearchParams();
  if (filters?.module) params.set('module', filters.module);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.phase) params.set('phase', filters.phase);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<Trial[]>(`/trials${qs}`);
}

export async function getTrialEligiblePatients(trialId: string): Promise<Patient[]> {
  return apiFetch<Patient[]>(`/trials/${trialId}/eligible-patients`);
}

export async function referPatientToTrial(patientId: string, trialId: string): Promise<void> {
  await apiFetch<void>(`/trials/${trialId}/refer`, {
    method: 'POST',
    body: JSON.stringify({ patientId }),
  });
}

// ─── Audit ──────────────────────────────────────────────────────────────────

export async function logAction(action: string, details: Record<string, any>): Promise<void> {
  await apiFetch<void>('/audit/log', {
    method: 'POST',
    body: JSON.stringify({ action, details, timestamp: new Date().toISOString() }),
  });
}
