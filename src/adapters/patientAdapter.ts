/**
 * Patient Adapter — transforms backend patient records to frontend format.
 *
 * Backend returns a flat Patient shape from the API;
 * frontend components use StandardPatientBase from StandardInterfaces.ts.
 */

import type { Patient } from '../services/api';

// Frontend patient shape (matches StandardPatientBase)
export interface FrontendPatient {
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

// ─── Mapping helpers ────────────────────────────────────────────────────────

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type Priority = 'low' | 'medium' | 'high';

const VALID_RISK: Set<string> = new Set(['low', 'medium', 'high', 'critical']);
const VALID_PRIORITY: Set<string> = new Set(['low', 'medium', 'high']);

function mapRisk(raw: string | undefined): RiskLevel {
  const lower = (raw || 'medium').toLowerCase();
  return VALID_RISK.has(lower) ? (lower as RiskLevel) : 'medium';
}

function mapPriority(raw: string | undefined): Priority {
  const lower = (raw || 'medium').toLowerCase();
  return VALID_PRIORITY.has(lower) ? (lower as Priority) : 'medium';
}

function mapGender(raw: string | undefined): 'M' | 'F' {
  const upper = (raw || 'M').toUpperCase();
  return upper === 'F' || upper === 'FEMALE' ? 'F' : 'M';
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function adaptBackendPatientToFrontend(p: Patient): FrontendPatient {
  return {
    id: p.id,
    name: p.name,
    mrn: p.mrn,
    age: p.age,
    gender: mapGender(p.gender),
    provider: p.provider || '',
    riskLevel: mapRisk(p.riskLevel),
    alerts: p.alerts || [],
    priority: mapPriority(p.priority),
  };
}

export function adaptBackendPatientsToFrontend(patients: Patient[]): FrontendPatient[] {
  return patients.map(adaptBackendPatientToFrontend);
}
