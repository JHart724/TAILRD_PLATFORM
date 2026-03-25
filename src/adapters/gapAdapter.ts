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
