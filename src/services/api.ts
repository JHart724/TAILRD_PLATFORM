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

// ─── CSRF Token Helper ─────────────────────────────────────────────────────

function getCsrfToken(): string | null {
  const match = document.cookie.match(/__tailrd_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── Base Fetch Helper ──────────────────────────────────────────────────────

export async function apiFetch<T>(
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

  // Attach CSRF token for mutating requests
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
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

// ─── Heart Failure Module ───────────────────────────────────────────────────

export interface HFGDMTPillar {
  current: number | null;
  target: number;
  status: 'green' | 'amber' | 'red' | 'unknown';
  /** AUDIT-324: evaluable patients NOT on this class (was "patients with an open gap"). */
  missingCount: number;
  onTherapyCount?: number;
  evaluableCount?: number;
}

/** AUDIT-324: the explicit evaluable denominator, with the three-way unevaluable split. */
export interface HFGDMTDenominator {
  criteria: string;
  cohortTotal: number;
  evaluable: number;
  unevaluable: number;
  unevaluableReasons: { lvefAbove40: number; echoStale: number; echoAbsent: number };
}

export interface HFDashboardData {
  summary: {
    totalPatients: number;
    totalOpenGaps: number;
    gapsByType: Record<string, number>;
    deviceCandidates: number;
    gdmtOptimized: number;
    /** AUDIT-324: divide gdmtOptimized by THIS, never by totalPatients. */
    gdmtOptimizedDenominator?: number;
  };
  gdmtMetrics: {
    aceArb: HFGDMTPillar;
    betaBlocker: HFGDMTPillar;
    mra: HFGDMTPillar;
    sglt2i: HFGDMTPillar;
  };
  gdmtDenominator?: HFGDMTDenominator;
  recentAlerts: Array<{
    gapId: string;
    patientId: string;
    type: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
    currentStatus: string;
    targetStatus: string;
    identifiedAt: string;
  }>;
  source: string;
}

export interface HFWorklistPatient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  riskCategory: string | null;
  riskScore: number | null;
  gapCount: number;
  careGaps: string[];
  lastAssessment: string | null;
}

export async function getHeartFailureDashboard(): Promise<HFDashboardData> {
  return apiFetch<HFDashboardData>('/modules/heart-failure/dashboard');
}

export async function getHeartFailureWorklist(limit?: number): Promise<HFWorklistPatient[]> {
  const qs = limit ? `?limit=${limit}` : '';
  return apiFetch<HFWorklistPatient[]>(`/modules/heart-failure/patients${qs}`);
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

export async function submitRegistryCase(caseId: string): Promise<void> {
  await apiFetch<void>(`/registry/cases/${caseId}/submit`, { method: 'POST' });
}

export async function approveRegistryCase(caseId: string): Promise<void> {
  await apiFetch<void>(`/registry/cases/${caseId}/approve`, { method: 'POST' });
}

// The backend requires a non-empty reason (<= 1000 chars) - maker-checker rejections are never silent.
export async function rejectRegistryCase(caseId: string, reason: string): Promise<void> {
  await apiFetch<void>(`/registry/cases/${caseId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
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

/**
 * AUDIT-148 honest-matcher shape. The endpoint returns ALL THREE match states (INDETERMINATE is NOT
 * filtered out), with per-criterion verdicts and the named unthreaded signals - the previous
 * `Promise<Patient[]>` signature under-described it and dropped exactly the honesty payload.
 */
export type TrialMatchStatus = 'ELIGIBLE' | 'INELIGIBLE' | 'INDETERMINATE';

export interface TrialCriterionResult {
  criterionId: string;
  polarity: 'inclusion' | 'exclusion';
  verdict: 'MET' | 'FAILED' | 'UNEVALUABLE';
  missingSignal?: string;
}

export interface TrialMatchCandidate {
  id: string;
  name: string;
  mrn: string;
  age: number;
  gender?: string;
  matchStatus: TrialMatchStatus;
  criteriaResults: TrialCriterionResult[];
  indeterminateSignals: string[];
}

/**
 * Why a precomputed figure carries an as-of (TrialMatch identity design 3.6, rulings R2/R3).
 *
 * Trial verdicts are computed by an operator-gated refresh run, not per request - a full pass over a
 * 25,571-patient tenant costs 451 seconds. A number produced that way is only honest if it says WHEN it
 * was computed and UNDER WHAT, so every trials read carries this envelope and the UI shows it with the
 * prominence the old sample banner had.
 *
 * `staleReasons` names each axis independently rather than collapsing to one boolean, because they mean
 * different things and a caller should be able to say WHICH:
 *   never-run - nothing is persisted yet. Counts are NOT zero, they are UNKNOWN; render it that way.
 *   age       - older than the 36h bound. The refresh is not running (an operational signal).
 *   build     - computed by a different build than the one serving. A matcher change (cf. AUDIT-226)
 *               moves verdicts with criteria untouched, and this is the axis that catches it.
 *   criteria  - the trial's criteria changed since the verdicts were computed. The mirror case.
 *
 * Detection is automatic; the refresh is NOT (R3). Nothing here triggers a recompute.
 */
export type TrialStaleReason = 'never-run' | 'age' | 'build' | 'criteria';

export interface TrialAsOf {
  /** OLDEST evaluatedAt in the covered set - an as-of is a promise about the whole set. */
  evaluatedAt: string | null;
  lastRunFinishedAt: string | null;
  runBuildSha: string | null;
  liveBuildSha: string;
  stale: boolean;
  staleReasons: TrialStaleReason[];
}

/**
 * AUDIT-227: the endpoint is PAGED. It previously returned every tenant patient in one array, which
 * deterministically OOM'd at real tenant scale (25,571 patients; a 3,000-patient probe died exit 137).
 * `pageCounts` is PAGE-LOCAL - never sum pages to get tenant totals, call getTrialsSummary() instead.
 *
 * TRIALS PR 3: the page is now a read of PERSISTED verdicts. `criteriaResults` and
 * `indeterminateSignals` come off the stored row - the same evaluation that produced `matchStatus` -
 * so the detail always explains the verdict shown beside it. `asOf` says how current that is.
 */
export interface TrialEligiblePage {
  patients: TrialMatchCandidate[];
  pageSize: number;
  nextCursor: string | null;
  hasMore: boolean;
  pageCounts: Partial<Record<TrialMatchStatus, number>>;
  asOf: TrialAsOf;
}

export async function getTrialEligiblePatients(
  trialId: string,
  opts?: { cursor?: string | null; pageSize?: number },
): Promise<TrialEligiblePage> {
  const params = new URLSearchParams();
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<TrialEligiblePage>(`/trials/${trialId}/eligible-patients${qs}`);
}

/** Counts-only aggregate across all three match states. Never returns patient rows. */
export interface TrialSummaryRow {
  trialId: string;
  name: string;
  module: string;
  phase: string;
  status: string;
  eligible: number;
  indeterminate: number;
  ineligible: number;
  evaluated: number;
}

export interface TrialsSummary {
  trials: TrialSummaryRow[];
  /** Distinct patients carrying a current verdict - the screened denominator, population-true. */
  patientsEvaluated: number;
  computedInMs: number;
  asOf: TrialAsOf;
}
// TRIALS PR 3 removed `complete` from this shape. It existed because the summary used to EVALUATE the
// tenant inside the request under a 20s budget and returned a truncated, id-ordered sample. That sample
// was not merely incomplete but NOT REPRESENTATIVE (measured: a 1,200-patient prefix reads HFrEF
// 5/52/1143 where the population reads 68/24,319/1,184), so no caller could responsibly show it as an
// executive figure. The counts are now read from persisted verdicts and are population-true, so there is
// no partial to flag - what needs saying is how CURRENT they are, which `asOf` says.

export async function getTrialsSummary(): Promise<TrialsSummary> {
  return apiFetch<TrialsSummary>('/trials/summary');
}

export interface TrialReferralRow {
  referralId: string;
  patientId: string;
  trialId: string;
  status: string;
  matchStatusAtReferral: TrialMatchStatus;
  referredBy: string;
  referredAt: string;
  notes: string | null;
}

export async function getTrialReferrals(trialId: string): Promise<TrialReferralRow[]> {
  return apiFetch<TrialReferralRow[]>(`/trials/${trialId}/referrals`);
}

/**
 * Record a clinician's referral decision. NOT gated on matchStatus - an INDETERMINATE patient may be
 * referred precisely to drive the one missing test.
 *
 * CLIENT CONVENTION (AUDIT-227): idempotency is enforced by the DB constraint
 * `@@unique([patientId, trialId, hospitalId])`, so a duplicate referral returns **409**, not a silent
 * success. Callers should treat 409 as SUCCESS-EQUIVALENT ("already referred") rather than an error -
 * a retried or double-clicked referral has achieved its intent. Any other non-2xx is a real failure.
 */
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
