/**
 * Gap Adapter — transforms backend gap data to frontend format.
 *
 * The backend returns a flat ClinicalGap shape; the frontend HF module
 * (and other modules) use HFClinicalGap with slightly different field
 * names, enum casing, and embedded patient arrays.
 */

import type { ClinicalGap, GapPatient } from '../services/api';

// ─── Frontend Gap Shape (matches hfGapData.ts HFClinicalGap) ────────────────

export type FrontendGapCategory = 'Gap' | 'Growth' | 'Safety' | 'Discovery';
export type FrontendPriority = 'high' | 'medium' | 'low';

export interface FrontendClinicalGap {
  id: string;
  name: string;
  category: FrontendGapCategory;
  patientCount: number;
  dollarOpportunity: number;
  evidence: string;
  cta: string;
  priority: FrontendPriority;
  detectionCriteria: string[];
  patients: FrontendGapPatient[];
  subcategories?: { label: string; count: number }[];
  tag?: string;
  safetyNote?: string;
  whyMissed?: string;
  whyTailrd?: string;
  methodologyNote?: string;
  diagnosticOpportunity?: number;
  pharmaceuticalOpportunity?: number;
}

export interface FrontendGapPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  signals: string[];
  keyValues: Record<string, string | number>;
  tier?: string;
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, FrontendGapCategory> = {
  safety: 'Safety',
  gap: 'Gap',
  discovery: 'Discovery',
  growth: 'Growth',
  quality: 'Gap',
  deprescribing: 'Safety',
};

const PRIORITY_MAP: Record<string, FrontendPriority> = {
  'HIGH PRIORITY': 'high',
  'MEDIUM PRIORITY': 'medium',
  'LOW PRIORITY': 'low',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

function mapCategory(raw: string | undefined): FrontendGapCategory {
  if (!raw) return 'Gap';
  return CATEGORY_MAP[raw.toLowerCase()] || 'Gap';
}

function mapPriority(raw: string | undefined): FrontendPriority {
  if (!raw) return 'medium';
  return PRIORITY_MAP[raw] || PRIORITY_MAP[raw.toLowerCase()] || 'medium';
}

function adaptPatient(p: GapPatient): FrontendGapPatient {
  return {
    id: p.id,
    name: p.name,
    mrn: p.mrn,
    age: p.age,
    signals: p.signals || [],
    keyValues: p.keyValues || {},
    tier: p.tier,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function adaptBackendGapToFrontend(
  gap: ClinicalGap,
  patients?: GapPatient[]
): FrontendClinicalGap {
  return {
    id: gap.id,
    name: gap.name || gap.description || '',
    category: mapCategory(gap.category || gap.gapType),
    patientCount: gap.patientCount,
    dollarOpportunity: gap.dollarOpportunity,
    evidence: gap.evidence || '',
    cta: gap.cta || '',
    priority: mapPriority(gap.priority),
    detectionCriteria: gap.detectionCriteria || [],
    patients: (patients || []).map(adaptPatient),
    subcategories: gap.subcategories,
    tag: gap.tag,
    safetyNote: gap.safetyNote,
    whyMissed: gap.whyMissed,
    whyTailrd: gap.whyTailrd,
    methodologyNote: gap.methodologyNote,
    diagnosticOpportunity: gap.diagnosticOpportunity,
    pharmaceuticalOpportunity: gap.pharmaceuticalOpportunity,
  };
}

export function adaptBackendGapsToFrontend(gaps: ClinicalGap[]): FrontendClinicalGap[] {
  return gaps.map((g) => adaptBackendGapToFrontend(g));
}

// ─── Real-time API adapter ──────────────────────────────────────────────────
// Transforms the shape returned by GET /api/gaps/:moduleId/detailed
// into FrontendClinicalGap for the dashboard components.

interface DetailedApiGap {
  gapType: string;
  status: string;
  target: string;
  medication: string | null;
  recommendations: Record<string, unknown> | null;
  patients: Array<{
    id: string;
    firstName: string;
    lastName: string;
    mrn: string;
    age: number | null;
    gender: string;
    riskCategory: string | null;
    gapId: string;
    createdAt: string;
  }>;
  count: number;
}

const GAP_TYPE_CATEGORY: Record<string, FrontendGapCategory> = {
  MEDICATION_MISSING: 'Gap',
  MEDICATION_UNDERDOSED: 'Gap',
  MEDICATION_CONTRAINDICATED: 'Safety',
  DEVICE_ELIGIBLE: 'Growth',
  DEVICE_UPGRADE_DUE: 'Growth',
  MONITORING_OVERDUE: 'Gap',
  FOLLOWUP_OVERDUE: 'Gap',
  PROCEDURE_INDICATED: 'Growth',
  SCREENING_DUE: 'Discovery',
  REFERRAL_NEEDED: 'Gap',
  DOCUMENTATION_GAP: 'Gap',
  SAFETY_ALERT: 'Safety',
  REHABILITATION_ELIGIBLE: 'Growth',
  IMAGING_OVERDUE: 'Gap',
};

const GAP_TYPE_PRIORITY: Record<string, FrontendPriority> = {
  MEDICATION_MISSING: 'high',
  MEDICATION_UNDERDOSED: 'medium',
  MEDICATION_CONTRAINDICATED: 'high',
  SAFETY_ALERT: 'high',
  DEVICE_ELIGIBLE: 'high',
  PROCEDURE_INDICATED: 'high',
  SCREENING_DUE: 'medium',
  MONITORING_OVERDUE: 'medium',
  FOLLOWUP_OVERDUE: 'medium',
  REFERRAL_NEEDED: 'medium',
  DOCUMENTATION_GAP: 'low',
  REHABILITATION_ELIGIBLE: 'medium',
  IMAGING_OVERDUE: 'medium',
  DEVICE_UPGRADE_DUE: 'medium',
};

export function adaptDetailedApiGap(gap: DetailedApiGap, index: number): FrontendClinicalGap {
  return {
    id: `api-gap-${index}-${gap.gapType}`,
    name: gap.status,
    category: GAP_TYPE_CATEGORY[gap.gapType] || 'Gap',
    patientCount: gap.count,
    dollarOpportunity: 0,
    evidence: (gap.recommendations as Record<string, string>)?.guideline || '',
    cta: (gap.recommendations as Record<string, string>)?.action || gap.target,
    priority: GAP_TYPE_PRIORITY[gap.gapType] || 'medium',
    detectionCriteria: [],
    patients: gap.patients.map(p => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      mrn: p.mrn,
      age: p.age || 0,
      signals: [gap.status],
      keyValues: { gapType: gap.gapType, medication: gap.medication || 'N/A' },
    })),
    tag: gap.medication || undefined,
  };
}

export function adaptDetailedApiGaps(gaps: DetailedApiGap[]): FrontendClinicalGap[] {
  return gaps.map((g, i) => adaptDetailedApiGap(g, i));
}

/**
 * Fetch gap data from the real backend API.
 * Returns null if API is unavailable (caller falls back to mock data).
 */
export async function fetchModuleGapsFromApi(moduleSlug: string): Promise<FrontendClinicalGap[] | null> {
  try {
    const { DATA_SOURCE } = await import('../config/dataSource');
    if (!DATA_SOURCE.useRealApi) return null;

    const token = localStorage.getItem('tailrd-session-token');
    const res = await fetch(`${DATA_SOURCE.apiUrl}/gaps/${moduleSlug}/detailed`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data?.gaps) return null;

    return adaptDetailedApiGaps(json.data.gaps);
  } catch {
    return null;
  }
}
