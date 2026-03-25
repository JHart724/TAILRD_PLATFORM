// ============================================================
// PLATFORM TOTALS — Single Source of Truth
// Computed directly from each module's gap data arrays.
// Every number in the platform (Executive views, free tier,
// configs) must reference these values.
// ============================================================

import { HF_CLINICAL_GAPS } from '../ui/heartFailure/components/clinical/hfGapData';
import { EP_CLINICAL_GAPS } from '../ui/electrophysiology/components/clinical/EPClinicalGapDetectionDashboard';
import { CAD_CLINICAL_GAPS } from '../ui/coronaryIntervention/components/clinical/CADClinicalGapDetectionDashboard';
import { SH_CLINICAL_GAPS } from '../ui/structuralHeart/components/clinical/SHClinicalGapDetectionDashboard';
import { VD_CLINICAL_GAPS } from '../ui/valvularDisease/components/clinical/VDClinicalGapDetectionDashboard';
import { PV_CLINICAL_GAPS } from '../ui/peripheralVascular/components/clinical/PVClinicalGapDetectionDashboard';

function sumModule(gaps: Array<{ patientCount: number; dollarOpportunity: number }>) {
  return {
    patients: gaps.reduce((sum, g) => sum + g.patientCount, 0),
    opportunity: gaps.reduce((sum, g) => sum + g.dollarOpportunity, 0),
    gaps: gaps.length,
  };
}

const hf = sumModule(HF_CLINICAL_GAPS);
const ep = sumModule(EP_CLINICAL_GAPS);
const cad = sumModule(CAD_CLINICAL_GAPS);
const sh = sumModule(SH_CLINICAL_GAPS);
const vd = sumModule(VD_CLINICAL_GAPS);
const pv = sumModule(PV_CLINICAL_GAPS);

const totalPatients = hf.patients + ep.patients + cad.patients + sh.patients + vd.patients + pv.patients;
const totalOpportunity = hf.opportunity + ep.opportunity + cad.opportunity + sh.opportunity + vd.opportunity + pv.opportunity;

export const PLATFORM_TOTALS = {
  totalPatients,
  totalOpportunity,
  quarterlyActionable: Math.round(totalOpportunity * 0.3),
  modules: { hf, ep, cad, sh, vd, pv },
};

// ── Real API fetch (falls back to mock on failure or demo mode) ──
import { DATA_SOURCE } from '../config/dataSource';
import { getPlatformTotals as fetchPlatformTotalsFromApi } from '../services/api';

export async function fetchRealPlatformTotals(): Promise<typeof PLATFORM_TOTALS> {
  if (!DATA_SOURCE.useRealApi) return PLATFORM_TOTALS;
  try {
    const data = await fetchPlatformTotalsFromApi();
    return data as typeof PLATFORM_TOTALS;
  } catch {
    return PLATFORM_TOTALS; // fallback to mock
  }
}

// ── Formatting helpers ──────────────────────────────────────
export function formatDollars(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export function formatPatients(count: number): string {
  return count.toLocaleString();
}
