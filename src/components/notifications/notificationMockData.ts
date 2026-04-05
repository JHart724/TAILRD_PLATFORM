// ──────────────────────────────────────────────────────────
// TAILRD Notification & Communication Center — Mock Data
// ──────────────────────────────────────────────────────────

// ── Types ──────────────────────────────────────────────────

export type NotificationType = 'care_gap' | 'referral' | 'escalation' | 'system' | 'resolution';
export type SeverityLevel = 'critical' | 'high' | 'warning' | 'info' | 'success';
export type OrchestrationStageStatus = 'completed' | 'active' | 'pending' | 'skipped';

export interface NotificationAction {
  label: string;
  variant: 'primary' | 'secondary' | 'ghost';
}

export interface CareGapNotification {
  id: string;
  type: NotificationType;
  severity: SeverityLevel;
  title: string;
  message: string;
  patientName?: string;
  patientMRN?: string;
  module?: string;
  moduleLabel?: string;
  timestamp: string;
  isRead: boolean;
  actions?: NotificationAction[];
}

export interface OrchestrationStage {
  id: string;
  stage: string;
  status: OrchestrationStageStatus;
  timestamp?: string;
  description: string;
  detail?: string;
  actor?: string;
}

export interface EchoData {
  avArea: string;
  meanGradient: string;
  peakVelocity: string;
  ef: string;
}

export interface CareGapOrchestration {
  id: string;
  patientName: string;
  patientMRN: string;
  patientAge: number;
  patientSex: string;
  condition: string;
  conditionDetail: string;
  guidelineBasis: string;
  module: string;
  moduleLabel: string;
  severity: SeverityLevel;
  currentStage: string;
  detectedAt: string;
  echo?: EchoData;
  stages: OrchestrationStage[];
  isFeatured?: boolean;
}


// ── Helper: relative timestamps ────────────────────────────

function hoursAgo(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

function daysAgo(days: number, hoursOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hoursOffset);
  return d.toISOString();
}


// ── Demo Notifications ────────────────────────────────────
// DEMO DATA: Replace with real-time notifications from backend
// when P1-NOTIF-1 (clinical alert delivery) is implemented.

export const MOCK_NOTIFICATIONS: CareGapNotification[] = [
  {
    id: 'N001',
    type: 'escalation',
    severity: 'critical',
    title: 'Escalation: Severe Aortic Stenosis — No Physician Response',
    message: 'Margaret Chen (76F) has severe AS with AVA 0.7 cm\u00B2. 48-hour response window expired. Auto-escalated to Division Chief. Auto-referral to Structural Heart in 4 hours if no action.',
    patientName: 'Margaret Chen',
    patientMRN: 'MRN-2847193',
    module: 'structural',
    moduleLabel: 'Structural Heart',
    timestamp: hoursAgo(1),
    isRead: false,
    actions: [
      { label: 'Review Case', variant: 'primary' },
      { label: 'View Timeline', variant: 'secondary' },
    ],
  },
  {
    id: 'N002',
    type: 'care_gap',
    severity: 'critical',
    title: 'New Care Gap: Severe AS Detected',
    message: 'Robert Hanson (81M) — TTE shows AVA 0.6 cm\u00B2, mean gradient 52 mmHg. No valve referral on record. Cardiologist Dr. Rivera notified.',
    patientName: 'Robert Hanson',
    patientMRN: 'MRN-3019482',
    module: 'structural',
    moduleLabel: 'Structural Heart',
    timestamp: hoursAgo(3),
    isRead: false,
    actions: [
      { label: 'Review', variant: 'primary' },
    ],
  },
  {
    id: 'N003',
    type: 'resolution',
    severity: 'success',
    title: 'Referral Accepted: Severe AS — Eleanor Voss',
    message: 'Dr. Patel confirmed referral to Structural Heart team within 2 hours. Appointment scheduled for valve clinic evaluation March 18.',
    patientName: 'Eleanor Voss',
    patientMRN: 'MRN-1956374',
    module: 'structural',
    moduleLabel: 'Structural Heart',
    timestamp: hoursAgo(6),
    isRead: false,
  },
  {
    id: 'N004',
    type: 'care_gap',
    severity: 'high',
    title: 'HFrEF GDMT Gap: Missing ARNI + SGLT2i',
    message: 'James Morton (68M) — EF 28%, on beta-blocker + MRA only. Missing sacubitril/valsartan and empagliflozin. Two of four GDMT pillars absent.',
    patientName: 'James Morton',
    patientMRN: 'MRN-4482710',
    module: 'hf',
    moduleLabel: 'Heart Failure',
    timestamp: hoursAgo(8),
    isRead: false,
    actions: [
      { label: 'Review GDMT', variant: 'primary' },
    ],
  },
  {
    id: 'N005',
    type: 'escalation',
    severity: 'warning',
    title: 'Approaching Escalation: AF Anticoagulation Gap',
    message: 'Patricia Kim (72F) — CHA\u2082DS\u2082-VASc score 4, no anticoagulant prescribed. Physician notified 5 days ago. Escalation in 48 hours.',
    patientName: 'Patricia Kim',
    patientMRN: 'MRN-2738491',
    module: 'ep',
    moduleLabel: 'Electrophysiology',
    timestamp: hoursAgo(12),
    isRead: true,
  },
  {
    id: 'N006',
    type: 'referral',
    severity: 'info',
    title: 'Cross-Referral: EP to Structural Heart',
    message: 'William Torres (74M) — Referred from EP for LBBB with new moderate-severe MR on echo. Structural Heart coordinator assigned.',
    patientName: 'William Torres',
    patientMRN: 'MRN-3847261',
    module: 'structural',
    moduleLabel: 'Structural Heart',
    timestamp: daysAgo(1),
    isRead: true,
  },
  {
    id: 'N007',
    type: 'care_gap',
    severity: 'critical',
    title: 'Critical Limb Ischemia — No Vascular Evaluation',
    message: 'Dorothy Pham (69F) — CLI diagnosis with ABI 0.32. No vascular surgery referral. Limb threat assessment recommended urgently.',
    patientName: 'Dorothy Pham',
    patientMRN: 'MRN-5019273',
    module: 'peripheral',
    moduleLabel: 'Peripheral Vascular',
    timestamp: daysAgo(1, 4),
    isRead: true,
    actions: [
      { label: 'Review', variant: 'primary' },
    ],
  },
  {
    id: 'N008',
    type: 'system',
    severity: 'info',
    title: 'New Echo Data Ingested — 14 Reports Processed',
    message: '14 transthoracic echocardiography reports received from EHR integration. 3 flagged for clinical review: 2 severe AS, 1 severe MR.',
    timestamp: daysAgo(1, 6),
    isRead: true,
  },
  {
    id: 'N009',
    type: 'resolution',
    severity: 'success',
    title: 'Care Gap Closed: Post-PCI Medication Compliance',
    message: 'David Reyes (59M) — Dual antiplatelet therapy confirmed at 30-day follow-up. Care gap resolved automatically.',
    patientName: 'David Reyes',
    patientMRN: 'MRN-6182940',
    module: 'coronary',
    moduleLabel: 'Coronary',
    timestamp: daysAgo(2),
    isRead: true,
  },
  {
    id: 'N010',
    type: 'system',
    severity: 'info',
    title: 'Weekly Digest: 6 Care Gaps Resolved, 4 New Detected',
    message: 'Across all modules: 6 care gaps closed this week (3 AS referrals completed, 2 GDMT optimized, 1 anticoag started). 4 new gaps detected. Net improvement: +2 resolved.',
    timestamp: daysAgo(3),
    isRead: true,
  },
];


// ── Care Gap Orchestrations ────────────────────────────────

export const MOCK_ORCHESTRATIONS: CareGapOrchestration[] = [
  // ── FEATURED CASE: Severe AS, active escalation ──
  {
    id: 'CG001',
    patientName: 'Margaret Chen',
    patientMRN: 'MRN-2847193',
    patientAge: 76,
    patientSex: 'F',
    condition: 'Severe Aortic Stenosis',
    conditionDetail: 'Severe AS with no valve referral in past 60 days. No prior TAVR or SAVR on record.',
    guidelineBasis: 'ACC/AHA Class I — Severe symptomatic AS warrants evaluation for aortic valve intervention (Level of Evidence: A)',
    module: 'structural',
    moduleLabel: 'Structural Heart',
    severity: 'critical',
    currentStage: 'auto_referral_pending',
    detectedAt: daysAgo(3),
    isFeatured: true,
    echo: {
      avArea: '0.7 cm\u00B2',
      meanGradient: '48 mmHg',
      peakVelocity: '4.5 m/s',
      ef: '58%',
    },
    stages: [
      {
        id: 'S1',
        stage: 'Detection',
        status: 'completed',
        timestamp: daysAgo(3),
        description: 'Echocardiography report processed via EHR integration. CQL rule STRUCTURAL_AS_SEVERITY_SCREEN triggered.',
        detail: 'AVA 0.7 cm\u00B2 (threshold: < 1.0), Mean gradient 48 mmHg (threshold: > 40), Peak velocity 4.5 m/s. No valve referral CPT (33361\u201333366) in past 60 days.',
        actor: 'TAILRD Detection Engine',
      },
      {
        id: 'S2',
        stage: 'Physician Notification',
        status: 'completed',
        timestamp: daysAgo(3, -1),
        description: 'Attending cardiologist Dr. Michael Williams notified via EHR inbox alert and secure platform message.',
        detail: 'Structured notification sent with echo findings, guideline basis, and one-click actions: Confirm Referral / Opt Out (with reason). PCP Dr. Sarah Lin copied.',
        actor: 'TAILRD Communication Engine',
      },
      {
        id: 'S3',
        stage: 'Response Window',
        status: 'completed',
        timestamp: daysAgo(1),
        description: '48-hour response window expired with no physician action. Reminder sent at 24 hours — no response.',
        detail: 'Per routing rules: Severe AS requires response within 48h. Reminder at 24h. Escalation at 48h. Dr. Williams did not confirm, defer, or opt out.',
        actor: 'System Timer',
      },
      {
        id: 'S4',
        stage: 'Escalation',
        status: 'completed',
        timestamp: daysAgo(1),
        description: 'Auto-escalated to Division Chief Dr. Anita Patel with full clinical summary and non-response documentation.',
        detail: 'Escalation notification includes: original echo findings, guideline citation, 48h non-response record, and patient risk context. Dr. Patel has 24h to act before auto-referral.',
        actor: 'TAILRD Escalation Engine',
      },
      {
        id: 'S5',
        stage: 'Auto-Referral Safety Net',
        status: 'active',
        timestamp: undefined,
        description: 'If no physician action within 24 hours, automatic referral to Structural Heart valve clinic will be initiated under pathway authority.',
        detail: 'Auto-referral creates order in EHR via EHR integration, assigns Structural Heart coordinator, and notifies valve clinic. Physician can still intervene before deadline.',
        actor: 'Pending — TAILRD Pathway Authority',
      },
    ],
  },

  // ── RESOLVED CASE: AS referral accepted quickly ──
  {
    id: 'CG002',
    patientName: 'Eleanor Voss',
    patientMRN: 'MRN-1956374',
    patientAge: 79,
    patientSex: 'F',
    condition: 'Severe Aortic Stenosis',
    conditionDetail: 'Severe AS with progressive symptoms. NYHA Class II with exertional dyspnea.',
    guidelineBasis: 'ACC/AHA Class I — Severe symptomatic AS warrants evaluation for aortic valve intervention',
    module: 'structural',
    moduleLabel: 'Structural Heart',
    severity: 'success',
    currentStage: 'resolved',
    detectedAt: daysAgo(5),
    echo: {
      avArea: '0.8 cm\u00B2',
      meanGradient: '44 mmHg',
      peakVelocity: '4.3 m/s',
      ef: '55%',
    },
    stages: [
      {
        id: 'S1',
        stage: 'Detection',
        status: 'completed',
        timestamp: daysAgo(5),
        description: 'TTE report processed. Severe AS criteria met.',
        detail: 'AVA 0.8 cm\u00B2, mean gradient 44 mmHg. No prior valve referral.',
        actor: 'TAILRD Detection Engine',
      },
      {
        id: 'S2',
        stage: 'Physician Notification',
        status: 'completed',
        timestamp: daysAgo(5, -1),
        description: 'Dr. Anita Patel notified via EHR inbox and secure message.',
        actor: 'TAILRD Communication Engine',
      },
      {
        id: 'S3',
        stage: 'Physician Response',
        status: 'completed',
        timestamp: daysAgo(5, -2),
        description: 'Dr. Patel confirmed referral to Structural Heart within 2 hours of notification.',
        detail: 'One-click confirmation via TAILRD. Structural Heart coordinator auto-assigned.',
        actor: 'Dr. Anita Patel',
      },
      {
        id: 'S4',
        stage: 'Referral & Scheduling',
        status: 'completed',
        timestamp: daysAgo(3),
        description: 'Structural Heart coordinator contacted patient. Valve clinic appointment scheduled for March 18.',
        detail: 'Referral order created in EHR via integration. Patient education materials sent.',
        actor: 'Sarah Kim, RN — Structural Heart Coordinator',
      },
      {
        id: 'S5',
        stage: 'Resolved',
        status: 'completed',
        timestamp: daysAgo(3),
        description: 'Care gap closed. Patient scheduled for comprehensive valve evaluation.',
        actor: 'TAILRD System',
      },
    ],
  },

  // ── HF CASE: GDMT optimization in progress ──
  {
    id: 'CG003',
    patientName: 'James Morton',
    patientMRN: 'MRN-4482710',
    patientAge: 68,
    patientSex: 'M',
    condition: 'HFrEF — Incomplete GDMT',
    conditionDetail: 'EF 28%, on metoprolol + spironolactone only. Missing ARNI (sacubitril/valsartan) and SGLT2i (empagliflozin). 2 of 4 GDMT pillars absent.',
    guidelineBasis: 'ACC/AHA Class I — All four pillars of GDMT recommended for HFrEF (EF \u2264 40%)',
    module: 'hf',
    moduleLabel: 'Heart Failure',
    severity: 'high',
    currentStage: 'awaiting_response',
    detectedAt: daysAgo(2),
    stages: [
      {
        id: 'S1',
        stage: 'Detection',
        status: 'completed',
        timestamp: daysAgo(2),
        description: 'Medication reconciliation identified 2 missing GDMT pillars for HFrEF patient.',
        detail: 'EF 28% confirmed on recent echo. Current meds: metoprolol 50mg BID, spironolactone 25mg daily. No ARNI or SGLT2i on medication list.',
        actor: 'TAILRD Detection Engine',
      },
      {
        id: 'S2',
        stage: 'Physician Notification',
        status: 'completed',
        timestamp: daysAgo(2, -1),
        description: 'HF cardiologist Dr. Rachel Gomez notified with GDMT optimization recommendations.',
        detail: 'Notification includes: current regimen, missing pillars, suggested titration pathway, contraindication screen (none found).',
        actor: 'TAILRD Communication Engine',
      },
      {
        id: 'S3',
        stage: 'Awaiting Response',
        status: 'active',
        timestamp: undefined,
        description: 'Awaiting Dr. Gomez\u2019s response. 14-day response window for GDMT gaps (per HF routing rules). 12 days remaining.',
        detail: 'HF GDMT gaps use a longer response window than structural gaps. Escalation to HF program director at day 14.',
        actor: 'System Timer',
      },
      {
        id: 'S4',
        stage: 'Escalation',
        status: 'pending',
        description: 'If no response by day 14, escalates to HF Program Director with full GDMT gap summary.',
        actor: 'Pending',
      },
      {
        id: 'S5',
        stage: 'Resolution',
        status: 'pending',
        description: 'Gap closes when ARNI and SGLT2i appear on medication list via EHR medication update.',
        actor: 'Pending',
      },
    ],
  },
];
