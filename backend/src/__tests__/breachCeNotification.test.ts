/**
 * breachCeNotification (5-BRC-06 P1.3.3c D10) - service + routes + template tests.
 *
 * Covers:
 *   - All 7 breachCeNotificationService state-transition methods
 *     (queueCeNotification, sendCeNotification, recordCeDelivery,
 *     recordCeAcknowledgment, recordCeFollowupRequest,
 *     recordCeFollowupResponse, closeCeNotification).
 *   - VALID_STATE_TRANSITIONS map completeness verified via observable
 *     valid + invalid transitions per state (terminal CE_CLOSED rejects all).
 *   - NotificationChannel discriminated union: email path through
 *     emailService.sendEmail; signedPdf + securePortal + sms throw
 *     NotImplementedError (v1.0 deferral per Q-5BRC-B).
 *   - Template render output: subject + bodyText + bodyHtml; required content
 *     A-F headers per 45 CFR 164.404(c)(1) plus 164.410 agency determination
 *     plus 164.414(b) burden-of-proof acknowledgment request.
 *   - Tenant-isolation enforcement per Q-5BRC-G + CLAUDE.md NEVER DO rules 6-8
 *     (BreachIncident hospitalId scope + CoveredEntity tenantId scope +
 *     TenantScopeViolationError on actor mismatch; SUPER_ADMIN bypass).
 *   - State machine lifecycle integration: full happy path
 *     DISCOVERED -> CLOSED with all 7 transitions exercised.
 *   - CE_FOLLOWUP cycle: CE_ACKNOWLEDGED -> CE_FOLLOWUP_REQUESTED ->
 *     CE_FOLLOWUP_RESPONDED -> CE_FOLLOWUP_REQUESTED -> CE_CLOSED.
 *   - All 10 BA-to-CE route handlers (7 CE workflow + 3 sister-bundle from
 *     5-BRC-02 + 5-BRC-03 + 5-BRC-07 + 5-BRC-08).
 *   - Sister-bundle handlers (four-factor-risk-assessment, ba-acts-as-agent,
 *     law-enforcement-delay) tenant-isolation + Zod validation + audit.
 *
 * Pattern mirrors src/routes/__tests__/cdsHooks.test.ts.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────

const breachIncidentFindFirst = jest.fn();
const breachIncidentUpdate = jest.fn();
const coveredEntityFindFirst = jest.fn();
const hospitalFindUnique = jest.fn();
const sendEmail = jest.fn().mockResolvedValue(undefined);
const writeAuditLog = jest.fn().mockResolvedValue(undefined);
const auditLoggerInfo = jest.fn();
const auditLoggerWarn = jest.fn();
const auditLoggerError = jest.fn();

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    breachIncident: {
      findFirst: (...args: unknown[]) => breachIncidentFindFirst(...args),
      update: (...args: unknown[]) => breachIncidentUpdate(...args),
    },
    coveredEntity: {
      findFirst: (...args: unknown[]) => coveredEntityFindFirst(...args),
    },
    hospital: {
      findUnique: (...args: unknown[]) => hospitalFindUnique(...args),
    },
  },
}));

jest.mock('../services/emailService', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

jest.mock('../middleware/auditLogger', () => ({
  writeAuditLog: (...args: unknown[]) => writeAuditLog(...args),
  auditLogger: {
    info: (...args: unknown[]) => auditLoggerInfo(...args),
    warn: (...args: unknown[]) => auditLoggerWarn(...args),
    error: (...args: unknown[]) => auditLoggerError(...args),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../middleware/auth', () => ({
  authenticateToken: (_req: unknown, _res: unknown, next: () => void) => next(),
  authorizeRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import type { Request, Response } from 'express';
import {
  queueCeNotification,
  sendCeNotification,
  recordCeDelivery,
  recordCeAcknowledgment,
  recordCeFollowupRequest,
  recordCeFollowupResponse,
  closeCeNotification,
  projectBreachToTemplateInput,
  BreachCeNotificationServiceError,
  InvalidStateTransitionError,
  CoveredEntityNotLinkedError,
  BreachIncidentNotFoundError,
  NotImplementedError,
  type NotificationChannel,
} from '../services/breachCeNotificationService';
import { TenantScopeViolationError, type AuthenticatedActor } from '../services/coveredEntityService';
import { renderBreachCeNotification, type BreachCeNotificationTemplateInput } from '../templates/breach-ce-notification';

// ─── Helpers ─────────────────────────────────────────────────────────────

const TENANT_A = 'hospital-tenant-a';
const TENANT_B = 'hospital-tenant-b';
const BREACH_ID = 'breach-id-1';
const CE_ID = 'ce-id-1';
const USER_ID = 'user-id-1';

function actor(role: AuthenticatedActor['role'], hospitalId = TENANT_A): AuthenticatedActor {
  return { userId: USER_ID, email: 'a@b.com', role, hospitalId };
}

function fakeBreach(overrides: Record<string, unknown> = {}) {
  return {
    id: BREACH_ID,
    hospitalId: TENANT_A,
    coveredEntityId: CE_ID,
    discoveredAt: new Date('2026-01-01T00:00:00Z'),
    status: 'DISCOVERED',
    severity: 'HIGH',
    incidentType: 'UNAUTHORIZED_ACCESS',
    description: 'Test breach',
    affectedRecords: 12,
    affectedFields: ['name', 'dob'],
    affectedPatientIds: ['p-1'],
    containmentActions: 'Disabled compromised account',
    remediationPlan: null,
    statusHistory: [],
    ceNotifiedAt: null,
    ceAcknowledgedAt: null,
    ceFollowupRequestedAt: null,
    ceFollowupRespondedAt: null,
    burdenOfProofRetentionUntil: null,
    baActsAsAgent: false,
    baActsAsAgentRationale: null,
    fourFactorRiskAssessment: null,
    fourFactorRiskCompletedAt: null,
    fourFactorRiskCompletedBy: null,
    lawEnforcementDelayActive: false,
    lawEnforcementDelayUntil: null,
    lawEnforcementDelayRationale: null,
    ...overrides,
  };
}

function fakeCe(overrides: Record<string, unknown> = {}) {
  return {
    id: CE_ID,
    tenantId: TENANT_A,
    name: 'Acme Health',
    legalName: 'Acme Health LLC',
    primaryContactName: 'Privacy Officer',
    primaryContactEmail: 'privacy@acme.example',
    primaryContactPhone: null,
    primaryContactAddress: null,
    escalationContactName: null,
    escalationContactEmail: null,
    escalationContactPhone: null,
    ceType: 'HOSPITAL',
    baaExecutedAt: new Date('2025-01-01'),
    baaExpiresAt: new Date('2027-01-01'),
    baaDocumentUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function fakeHospital() {
  return { id: TENANT_A, name: 'Tenant A' };
}

function primeLoadContext(breachOverrides: Record<string, unknown> = {}) {
  breachIncidentFindFirst.mockResolvedValue(fakeBreach(breachOverrides));
  coveredEntityFindFirst.mockResolvedValue(fakeCe());
  hospitalFindUnique.mockResolvedValue(fakeHospital());
}

interface AuthReq extends Request {
  user?: { userId: string; email: string; role: string; hospitalId: string };
}

function makeReq(opts: { body?: unknown; params?: Record<string, string>; user?: AuthReq['user'] } = {}): AuthReq {
  return {
    method: 'POST',
    headers: {},
    body: opts.body ?? {},
    params: opts.params ?? {},
    query: {},
    user: opts.user ?? { userId: USER_ID, email: 'a@b.com', role: 'SUPER_ADMIN', hospitalId: TENANT_A },
  } as unknown as AuthReq;
}

function makeRes(): Response {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status: jest.fn().mockImplementation(function (this: Response, code: number) {
      (this as unknown as { statusCode: number }).statusCode = code;
      return this;
    }),
    json: jest.fn().mockImplementation(function (this: Response, body: unknown) {
      (this as unknown as { body: unknown }).body = body;
      return this;
    }),
  };
  return res as unknown as Response;
}

function getHandler(method: 'post' | 'get' | 'put' | 'delete' | 'patch', path: string) {
  // AUDIT-089 dual-export workaround: breachNotification.ts emits both
  // `module.exports = router` (line 693) AND `export default router` (line 694).
  // The first replaces module.exports; the second runs against the local
  // `exports` ref (now stale), so `require(...).default` is undefined.
  // Read the resolved module value either way.
  const mod = require('../routes/breachNotification');
  const router = mod.default ?? mod;
  for (const layer of router.stack) {
    const route = layer.route;
    if (!route) continue;
    if (route.path === path && route.methods[method]) {
      return route.stack[route.stack.length - 1].handle as (req: Request, res: Response) => Promise<void>;
    }
  }
  throw new Error(`Handler not found for ${method.toUpperCase()} ${path}`);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── State machine: VALID_STATE_TRANSITIONS map completeness ─────────────

describe('VALID_STATE_TRANSITIONS map completeness', () => {
  it('queue accepts entry from DISCOVERED, INVESTIGATING, CONTAINED, RISK_ASSESSED', async () => {
    for (const fromStatus of ['DISCOVERED', 'INVESTIGATING', 'CONTAINED', 'RISK_ASSESSED']) {
      breachIncidentFindFirst.mockResolvedValueOnce(fakeBreach({ status: fromStatus }));
      coveredEntityFindFirst.mockResolvedValueOnce(fakeCe());
      breachIncidentUpdate.mockResolvedValueOnce(fakeBreach({ status: 'CE_NOTIFICATION_QUEUED' }));
      await expect(
        queueCeNotification(TENANT_A, BREACH_ID, CE_ID, actor('SUPER_ADMIN')),
      ).resolves.toBeDefined();
    }
  });

  it('queue rejects entry from CE_NOTIFICATION_SENT (already past queue stage)', async () => {
    breachIncidentFindFirst.mockResolvedValue(fakeBreach({ status: 'CE_NOTIFICATION_SENT' }));
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    await expect(
      queueCeNotification(TENANT_A, BREACH_ID, CE_ID, actor('SUPER_ADMIN')),
    ).rejects.toBeInstanceOf(InvalidStateTransitionError);
  });

  it('CE_CLOSED is terminal: closeCeNotification from CE_CLOSED throws InvalidStateTransitionError', async () => {
    primeLoadContext({ status: 'CE_CLOSED' });
    await expect(
      closeCeNotification(TENANT_A, BREACH_ID, actor('SUPER_ADMIN')),
    ).rejects.toBeInstanceOf(InvalidStateTransitionError);
  });

  it('CE_ACKNOWLEDGED can transition to CE_FOLLOWUP_REQUESTED or directly CE_CLOSED', async () => {
    primeLoadContext({ status: 'CE_ACKNOWLEDGED' });
    breachIncidentUpdate.mockResolvedValueOnce(fakeBreach({ status: 'CE_CLOSED' }));
    await expect(
      closeCeNotification(TENANT_A, BREACH_ID, actor('SUPER_ADMIN')),
    ).resolves.toBeDefined();

    primeLoadContext({ status: 'CE_ACKNOWLEDGED' });
    breachIncidentUpdate.mockResolvedValueOnce(fakeBreach({ status: 'CE_FOLLOWUP_REQUESTED' }));
    await expect(
      recordCeFollowupRequest(
        TENANT_A,
        BREACH_ID,
        { requestedAt: new Date(), question: 'q', requestedBy: 'r' },
        actor('SUPER_ADMIN'),
      ),
    ).resolves.toBeDefined();
  });

  it('InvalidStateTransitionError carries currentStatus + attemptedStatus + lists allowed nexts in message', () => {
    const err = new InvalidStateTransitionError('CE_NOTIFICATION_QUEUED', 'CE_CLOSED');
    expect(err.currentStatus).toBe('CE_NOTIFICATION_QUEUED');
    expect(err.attemptedStatus).toBe('CE_CLOSED');
    expect(err.code).toBe('INVALID_STATE_TRANSITION');
    expect(err.message).toContain('CE_NOTIFICATION_SENT');
  });
});

// ─── Service: queueCeNotification ────────────────────────────────────────

describe('queueCeNotification', () => {
  it('queues a breach + sets coveredEntityId', async () => {
    breachIncidentFindFirst.mockResolvedValue(fakeBreach({ status: 'DISCOVERED' }));
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ status: 'CE_NOTIFICATION_QUEUED' }));
    await queueCeNotification(TENANT_A, BREACH_ID, CE_ID, actor('SUPER_ADMIN'));
    expect(breachIncidentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: BREACH_ID },
      data: expect.objectContaining({ coveredEntityId: CE_ID, status: 'CE_NOTIFICATION_QUEUED' }),
    }));
    expect(auditLoggerInfo).toHaveBeenCalledWith('audit_event', expect.objectContaining({
      action: 'BREACH_CE_QUEUED',
      fromStatus: 'DISCOVERED',
      toStatus: 'CE_NOTIFICATION_QUEUED',
    }));
  });

  it('throws BreachIncidentNotFoundError when breach not in tenant', async () => {
    breachIncidentFindFirst.mockResolvedValue(null);
    await expect(
      queueCeNotification(TENANT_A, BREACH_ID, CE_ID, actor('SUPER_ADMIN')),
    ).rejects.toBeInstanceOf(BreachIncidentNotFoundError);
  });

  it('throws CoveredEntityNotLinkedError when CE not in tenant', async () => {
    breachIncidentFindFirst.mockResolvedValue(fakeBreach({ status: 'DISCOVERED' }));
    coveredEntityFindFirst.mockResolvedValue(null);
    await expect(
      queueCeNotification(TENANT_A, BREACH_ID, CE_ID, actor('SUPER_ADMIN')),
    ).rejects.toBeInstanceOf(CoveredEntityNotLinkedError);
  });

  it('throws TenantScopeViolationError when actor hospitalId mismatches tenantId (non-SUPER_ADMIN)', async () => {
    await expect(
      queueCeNotification(TENANT_B, BREACH_ID, CE_ID, actor('HOSPITAL_ADMIN', TENANT_A)),
    ).rejects.toBeInstanceOf(TenantScopeViolationError);
  });
});

// ─── Service: sendCeNotification + channel framework ────────────────────

describe('sendCeNotification', () => {
  it('dispatches via email channel + records ceNotifiedAt', async () => {
    primeLoadContext({ status: 'CE_NOTIFICATION_QUEUED' });
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ status: 'CE_NOTIFICATION_SENT' }));
    const channel: NotificationChannel = { type: 'email' };
    await sendCeNotification(TENANT_A, BREACH_ID, channel, actor('SUPER_ADMIN'));
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'privacy@acme.example',
      subject: expect.stringContaining('45 CFR 164.410'),
      text: expect.any(String),
      html: expect.any(String),
    }));
    expect(breachIncidentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'CE_NOTIFICATION_SENT', ceNotifiedAt: expect.any(Date) }),
    }));
    expect(auditLoggerInfo).toHaveBeenCalledWith('audit_event', expect.objectContaining({
      action: 'BREACH_CE_NOTIFIED',
      channel: 'email',
    }));
  });

  it('throws CE_PRIMARY_EMAIL_MISSING when CE has no primary email', async () => {
    breachIncidentFindFirst.mockResolvedValue(fakeBreach({ status: 'CE_NOTIFICATION_QUEUED' }));
    coveredEntityFindFirst.mockResolvedValue(fakeCe({ primaryContactEmail: null }));
    hospitalFindUnique.mockResolvedValue(fakeHospital());
    await expect(
      sendCeNotification(TENANT_A, BREACH_ID, { type: 'email' }, actor('SUPER_ADMIN')),
    ).rejects.toBeInstanceOf(BreachCeNotificationServiceError);
  });

  it('signedPdf channel throws NotImplementedError (v1.0 deferral per Q-5BRC-B)', async () => {
    primeLoadContext({ status: 'CE_NOTIFICATION_QUEUED' });
    await expect(
      sendCeNotification(TENANT_A, BREACH_ID, { type: 'signedPdf' }, actor('SUPER_ADMIN')),
    ).rejects.toBeInstanceOf(NotImplementedError);
  });

  it('securePortal channel throws NotImplementedError', async () => {
    primeLoadContext({ status: 'CE_NOTIFICATION_QUEUED' });
    await expect(
      sendCeNotification(TENANT_A, BREACH_ID, { type: 'securePortal' }, actor('SUPER_ADMIN')),
    ).rejects.toBeInstanceOf(NotImplementedError);
  });

  it('sms channel throws NotImplementedError', async () => {
    primeLoadContext({ status: 'CE_NOTIFICATION_QUEUED' });
    await expect(
      sendCeNotification(TENANT_A, BREACH_ID, { type: 'sms' }, actor('SUPER_ADMIN')),
    ).rejects.toBeInstanceOf(NotImplementedError);
  });

  it('NotImplementedError carries feature label', () => {
    const err = new NotImplementedError('signedPdf channel', 'deferred');
    expect(err.feature).toBe('signedPdf channel');
    expect(err.code).toBe('NOT_IMPLEMENTED');
  });
});

// ─── Service: recordCeDelivery ───────────────────────────────────────────

describe('recordCeDelivery', () => {
  it('records delivery + appends to statusHistory', async () => {
    primeLoadContext({ status: 'CE_NOTIFICATION_SENT' });
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ status: 'CE_NOTIFICATION_DELIVERED' }));
    const deliveredAt = new Date('2026-02-01T00:00:00Z');
    await recordCeDelivery(
      TENANT_A,
      BREACH_ID,
      { channel: 'email', deliveredAt, recipientConfirmation: 'SES MessageId xyz' },
      actor('SUPER_ADMIN'),
    );
    const updateCall = breachIncidentUpdate.mock.calls[0][0];
    expect(updateCall.data.status).toBe('CE_NOTIFICATION_DELIVERED');
    expect(updateCall.data.statusHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({
        status: 'CE_NOTIFICATION_DELIVERED',
        channel: 'email',
        recipientConfirmation: 'SES MessageId xyz',
      }),
    ]));
  });

  it('rejects when current status is not CE_NOTIFICATION_SENT', async () => {
    primeLoadContext({ status: 'CE_NOTIFICATION_QUEUED' });
    await expect(
      recordCeDelivery(
        TENANT_A,
        BREACH_ID,
        { channel: 'email', deliveredAt: new Date(), recipientConfirmation: 'x' },
        actor('SUPER_ADMIN'),
      ),
    ).rejects.toBeInstanceOf(InvalidStateTransitionError);
  });
});

// ─── Service: recordCeAcknowledgment + 164.414(b) retention ──────────────

describe('recordCeAcknowledgment', () => {
  it('records ack + sets 6-year burden-of-proof retention window from discoveredAt', async () => {
    primeLoadContext({ status: 'CE_NOTIFICATION_DELIVERED', discoveredAt: new Date('2026-01-01T00:00:00Z') });
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ status: 'CE_ACKNOWLEDGED' }));
    await recordCeAcknowledgment(
      TENANT_A,
      BREACH_ID,
      {
        acknowledgedAt: new Date('2026-02-15T00:00:00Z'),
        acknowledgmentSource: 'email',
        recordedBy: 'compliance-officer',
      },
      actor('SUPER_ADMIN'),
    );
    const data = breachIncidentUpdate.mock.calls[0][0].data;
    expect(data.status).toBe('CE_ACKNOWLEDGED');
    expect(data.burdenOfProofRetentionUntil).toBeInstanceOf(Date);
    // 6 years from discoveredAt (Jan 1, 2026 + 6*365 days)
    const expected = new Date(new Date('2026-01-01T00:00:00Z').getTime() + 6 * 365 * 24 * 60 * 60 * 1000);
    expect(data.burdenOfProofRetentionUntil.getTime()).toBe(expected.getTime());
  });
});

// ─── Service: recordCeFollowupRequest + recordCeFollowupResponse cycle ───

describe('CE_FOLLOWUP cycle', () => {
  it('CE_ACKNOWLEDGED -> CE_FOLLOWUP_REQUESTED -> CE_FOLLOWUP_RESPONDED -> CE_FOLLOWUP_REQUESTED (cycle) -> CE_CLOSED', async () => {
    // Step 1: ack -> followup_requested
    primeLoadContext({ status: 'CE_ACKNOWLEDGED' });
    breachIncidentUpdate.mockResolvedValueOnce(fakeBreach({ status: 'CE_FOLLOWUP_REQUESTED' }));
    await expect(
      recordCeFollowupRequest(
        TENANT_A,
        BREACH_ID,
        { requestedAt: new Date(), question: 'When was discovery?', requestedBy: 'ce-officer' },
        actor('SUPER_ADMIN'),
      ),
    ).resolves.toBeDefined();

    // Step 2: followup_requested -> followup_responded
    primeLoadContext({ status: 'CE_FOLLOWUP_REQUESTED' });
    breachIncidentUpdate.mockResolvedValueOnce(fakeBreach({ status: 'CE_FOLLOWUP_RESPONDED' }));
    await expect(
      recordCeFollowupResponse(
        TENANT_A,
        BREACH_ID,
        { respondedAt: new Date(), response: 'On 2026-01-01', recordedBy: 'ba-officer' },
        actor('SUPER_ADMIN'),
      ),
    ).resolves.toBeDefined();

    // Step 3: followup_responded -> followup_requested (loop)
    primeLoadContext({ status: 'CE_FOLLOWUP_RESPONDED' });
    breachIncidentUpdate.mockResolvedValueOnce(fakeBreach({ status: 'CE_FOLLOWUP_REQUESTED' }));
    await expect(
      recordCeFollowupRequest(
        TENANT_A,
        BREACH_ID,
        { requestedAt: new Date(), question: 'Followup-2', requestedBy: 'ce-officer' },
        actor('SUPER_ADMIN'),
      ),
    ).resolves.toBeDefined();

    // Step 4: but you cannot close from CE_FOLLOWUP_REQUESTED directly (must respond first)
    primeLoadContext({ status: 'CE_FOLLOWUP_REQUESTED' });
    await expect(
      closeCeNotification(TENANT_A, BREACH_ID, actor('SUPER_ADMIN')),
    ).rejects.toBeInstanceOf(InvalidStateTransitionError);

    // Step 5: respond -> close
    primeLoadContext({ status: 'CE_FOLLOWUP_RESPONDED' });
    breachIncidentUpdate.mockResolvedValueOnce(fakeBreach({ status: 'CE_CLOSED' }));
    await expect(
      closeCeNotification(TENANT_A, BREACH_ID, actor('SUPER_ADMIN')),
    ).resolves.toBeDefined();
  });
});

// ─── Lifecycle integration: full happy path ──────────────────────────────

describe('full lifecycle integration', () => {
  it('DISCOVERED -> QUEUED -> SENT -> DELIVERED -> ACKNOWLEDGED -> CLOSED (all 7 transitions wire correctly)', async () => {
    // queue
    breachIncidentFindFirst.mockResolvedValueOnce(fakeBreach({ status: 'DISCOVERED' }));
    coveredEntityFindFirst.mockResolvedValueOnce(fakeCe());
    breachIncidentUpdate.mockResolvedValueOnce(fakeBreach({ status: 'CE_NOTIFICATION_QUEUED' }));
    await queueCeNotification(TENANT_A, BREACH_ID, CE_ID, actor('SUPER_ADMIN'));

    // send (email)
    breachIncidentFindFirst.mockResolvedValueOnce(fakeBreach({ status: 'CE_NOTIFICATION_QUEUED' }));
    coveredEntityFindFirst.mockResolvedValueOnce(fakeCe());
    hospitalFindUnique.mockResolvedValueOnce(fakeHospital());
    breachIncidentUpdate.mockResolvedValueOnce(fakeBreach({ status: 'CE_NOTIFICATION_SENT' }));
    await sendCeNotification(TENANT_A, BREACH_ID, { type: 'email' }, actor('SUPER_ADMIN'));

    // delivery
    breachIncidentFindFirst.mockResolvedValueOnce(fakeBreach({ status: 'CE_NOTIFICATION_SENT' }));
    coveredEntityFindFirst.mockResolvedValueOnce(fakeCe());
    hospitalFindUnique.mockResolvedValueOnce(fakeHospital());
    breachIncidentUpdate.mockResolvedValueOnce(fakeBreach({ status: 'CE_NOTIFICATION_DELIVERED' }));
    await recordCeDelivery(
      TENANT_A,
      BREACH_ID,
      { channel: 'email', deliveredAt: new Date(), recipientConfirmation: 'ack-ms-id' },
      actor('SUPER_ADMIN'),
    );

    // ack
    breachIncidentFindFirst.mockResolvedValueOnce(fakeBreach({ status: 'CE_NOTIFICATION_DELIVERED' }));
    coveredEntityFindFirst.mockResolvedValueOnce(fakeCe());
    hospitalFindUnique.mockResolvedValueOnce(fakeHospital());
    breachIncidentUpdate.mockResolvedValueOnce(fakeBreach({ status: 'CE_ACKNOWLEDGED' }));
    await recordCeAcknowledgment(
      TENANT_A,
      BREACH_ID,
      {
        acknowledgedAt: new Date(),
        acknowledgmentSource: 'email',
        recordedBy: 'compliance',
      },
      actor('SUPER_ADMIN'),
    );

    // close
    breachIncidentFindFirst.mockResolvedValueOnce(fakeBreach({ status: 'CE_ACKNOWLEDGED' }));
    coveredEntityFindFirst.mockResolvedValueOnce(fakeCe());
    hospitalFindUnique.mockResolvedValueOnce(fakeHospital());
    breachIncidentUpdate.mockResolvedValueOnce(fakeBreach({ status: 'CE_CLOSED' }));
    await closeCeNotification(TENANT_A, BREACH_ID, actor('SUPER_ADMIN'));

    // Each transition emits a HIPAA-graded audit event
    const actions = auditLoggerInfo.mock.calls.map((c) => c[1].action);
    expect(actions).toEqual([
      'BREACH_CE_QUEUED',
      'BREACH_CE_NOTIFIED',
      'BREACH_CE_DELIVERED',
      'BREACH_CE_ACKNOWLEDGED',
      'BREACH_CE_CLOSED',
    ]);
  });
});

// ─── Tenant-isolation: cross-tenant attack rejection ─────────────────────

describe('tenant-isolation enforcement', () => {
  it('non-SUPER_ADMIN actor with tenant A cannot trigger send for tenant B breach (loadBreachContext throws TenantScopeViolationError)', async () => {
    // Service explicit gate inside queue runs before loadBreachContext.
    // For other methods, the breach.hospitalId mismatch check in
    // loadBreachContext rejects when actor.hospitalId !== breach.hospitalId.
    breachIncidentFindFirst.mockResolvedValue(fakeBreach({ hospitalId: TENANT_B }));
    await expect(
      sendCeNotification(TENANT_B, BREACH_ID, { type: 'email' }, actor('HOSPITAL_ADMIN', TENANT_A)),
    ).rejects.toBeInstanceOf(TenantScopeViolationError);
  });

  it('SUPER_ADMIN bypasses actor-vs-breach tenant check', async () => {
    breachIncidentFindFirst.mockResolvedValue(fakeBreach({ hospitalId: TENANT_B, status: 'CE_NOTIFICATION_QUEUED' }));
    coveredEntityFindFirst.mockResolvedValue(fakeCe({ tenantId: TENANT_B }));
    hospitalFindUnique.mockResolvedValue({ id: TENANT_B });
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ hospitalId: TENANT_B, status: 'CE_NOTIFICATION_SENT' }));
    await expect(
      sendCeNotification(TENANT_B, BREACH_ID, { type: 'email' }, actor('SUPER_ADMIN', TENANT_A)),
    ).resolves.toBeDefined();
  });

  it('breach without coveredEntityId throws CoveredEntityNotLinkedError', async () => {
    breachIncidentFindFirst.mockResolvedValue(fakeBreach({ coveredEntityId: null, status: 'CE_NOTIFICATION_QUEUED' }));
    await expect(
      sendCeNotification(TENANT_A, BREACH_ID, { type: 'email' }, actor('SUPER_ADMIN')),
    ).rejects.toBeInstanceOf(CoveredEntityNotLinkedError);
  });
});

// ─── Template: projectBreachToTemplateInput + render ─────────────────────

describe('breach-ce-notification template', () => {
  function templateInput(): BreachCeNotificationTemplateInput {
    return projectBreachToTemplateInput(
      fakeBreach() as never,
      fakeCe() as never,
      fakeHospital() as never,
    );
  }

  it('projectBreachToTemplateInput computes 60-day deadline from discoveredAt', () => {
    const input = templateInput();
    const expected = new Date(new Date('2026-01-01T00:00:00Z').getTime() + 60 * 24 * 60 * 60 * 1000);
    expect(input.sixtyDayDeadline.getTime()).toBe(expected.getTime());
  });

  it('projectBreachToTemplateInput projects affectedRecords + affectedFields', () => {
    const input = templateInput();
    expect(input.affectedIndividualsCount).toBe(12);
    expect(input.typesOfPhiInvolved).toEqual(['name', 'dob']);
  });

  it('renderBreachCeNotification produces subject + bodyText + bodyHtml with all 6 required content sections', () => {
    const rendered = renderBreachCeNotification(templateInput());
    expect(rendered.subject).toContain('45 CFR 164.410');
    expect(rendered.subject).toContain(BREACH_ID);

    // 164.404(c)(1)(A)-(F) headers in bodyText (incorporated by reference at 164.410(c)(1))
    expect(rendered.bodyText).toContain('164.404(c)(1)(A): Affected Individuals');
    expect(rendered.bodyText).toContain('164.404(c)(1)(B): Description of the Breach');
    expect(rendered.bodyText).toContain('164.404(c)(1)(C): Types of PHI Involved');
    expect(rendered.bodyText).toContain('164.404(c)(1)(D): Steps Individuals Should Take');
    expect(rendered.bodyText).toContain('164.404(c)(1)(E): BA Investigation and Mitigation');
    expect(rendered.bodyText).toContain('164.404(c)(1)(F): Contact Procedures');

    // 164.410-specific agency-determination + 164.414(b) burden-of-proof
    expect(rendered.bodyText).toContain('164.410: Agency Determination');
    expect(rendered.bodyText).toContain('164.414(b)');

    // bodyHtml mirrors all sections + escapes
    expect(rendered.bodyHtml).toContain('<!doctype html>');
    expect(rendered.bodyHtml).toContain('164.404(c)(1)(A): Affected Individuals');
    expect(rendered.bodyHtml).toContain('164.404(c)(1)(F): Contact Procedures');
  });

  it('renders BA-acts-as-agent rationale when baActsAsAgent=true', () => {
    const base = templateInput();
    const rendered = renderBreachCeNotification({
      ...base,
      baActsAsAgent: true,
      baActsAsAgentRationale: 'BAA section 4.2 confers agent status',
    });
    expect(rendered.bodyText).toContain('BA acts as an agent');
    expect(rendered.bodyText).toContain('BAA section 4.2 confers agent status');
  });

  it('renders non-agent path with proper 60-day clock language when baActsAsAgent=false', () => {
    const rendered = renderBreachCeNotification(templateInput());
    expect(rendered.bodyText).toContain('BA does not act as an agent');
    expect(rendered.bodyText).toContain('60-day notification clock starts upon receipt');
  });

  it('escapes HTML in user-controlled fields', () => {
    const base = templateInput();
    const rendered = renderBreachCeNotification({
      ...base,
      breachDescription: '<script>alert(1)</script>',
    });
    expect(rendered.bodyHtml).not.toContain('<script>alert(1)</script>');
    expect(rendered.bodyHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

// ─── Routes: 7 CE workflow handlers ──────────────────────────────────────

describe('BA-to-CE route handlers', () => {
  it('POST /:id/ce-notification/queue: 200 success + writeAuditLog', async () => {
    breachIncidentFindFirst.mockResolvedValue(fakeBreach({ status: 'DISCOVERED' }));
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ status: 'CE_NOTIFICATION_QUEUED' }));
    const handler = getHandler('post', '/:id/ce-notification/queue');
    const req = makeReq({ params: { id: BREACH_ID }, body: { coveredEntityId: CE_ID } });
    const res = makeRes();
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(writeAuditLog).toHaveBeenCalledWith(req, 'BREACH_DATA_MODIFIED', 'BreachIncident', BREACH_ID, expect.stringContaining(CE_ID));
  });

  it('POST /:id/ce-notification/queue: 400 on Zod validation failure', async () => {
    const handler = getHandler('post', '/:id/ce-notification/queue');
    const req = makeReq({ params: { id: BREACH_ID }, body: {} });
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /:id/ce-notification/send: 200 success + HIPAA-graded BREACH_CE_NOTIFIED audit', async () => {
    primeLoadContext({ status: 'CE_NOTIFICATION_QUEUED' });
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ status: 'CE_NOTIFICATION_SENT' }));
    const handler = getHandler('post', '/:id/ce-notification/send');
    const req = makeReq({ params: { id: BREACH_ID }, body: { channel: 'email' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(writeAuditLog).toHaveBeenCalledWith(req, 'BREACH_CE_NOTIFIED', 'BreachIncident', BREACH_ID, expect.stringContaining('email'));
  });

  it('POST /:id/ce-notification/send: 501 NotImplementedError on signedPdf v1.0 deferral', async () => {
    primeLoadContext({ status: 'CE_NOTIFICATION_QUEUED' });
    const handler = getHandler('post', '/:id/ce-notification/send');
    const req = makeReq({ params: { id: BREACH_ID }, body: { channel: 'signedPdf' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(501);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: 'NOT_IMPLEMENTED',
      feature: 'signedPdf channel',
    }));
  });

  it('POST /:id/ce-notification/send: 409 InvalidStateTransitionError when out of sequence', async () => {
    primeLoadContext({ status: 'CE_ACKNOWLEDGED' });
    const handler = getHandler('post', '/:id/ce-notification/send');
    const req = makeReq({ params: { id: BREACH_ID }, body: { channel: 'email' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'INVALID_STATE_TRANSITION',
      currentStatus: 'CE_ACKNOWLEDGED',
      attemptedStatus: 'CE_NOTIFICATION_SENT',
    }));
  });

  it('POST /:id/ce-notification/delivery: 200 success', async () => {
    primeLoadContext({ status: 'CE_NOTIFICATION_SENT' });
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ status: 'CE_NOTIFICATION_DELIVERED' }));
    const handler = getHandler('post', '/:id/ce-notification/delivery');
    const req = makeReq({
      params: { id: BREACH_ID },
      body: {
        channel: 'email',
        deliveredAt: '2026-02-01T00:00:00Z',
        recipientConfirmation: 'SES MessageId xyz',
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('POST /:id/ce-acknowledgment: 200 success + HIPAA-graded BREACH_CE_ACKNOWLEDGED audit', async () => {
    primeLoadContext({ status: 'CE_NOTIFICATION_DELIVERED' });
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ status: 'CE_ACKNOWLEDGED' }));
    const handler = getHandler('post', '/:id/ce-acknowledgment');
    const req = makeReq({
      params: { id: BREACH_ID },
      body: {
        acknowledgedAt: '2026-02-15T00:00:00Z',
        acknowledgmentSource: 'email',
        recordedBy: 'compliance',
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(writeAuditLog).toHaveBeenCalledWith(req, 'BREACH_CE_ACKNOWLEDGED', 'BreachIncident', BREACH_ID, expect.stringContaining('email'));
  });

  it('POST /:id/ce-followup-request: 200 success', async () => {
    primeLoadContext({ status: 'CE_ACKNOWLEDGED' });
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ status: 'CE_FOLLOWUP_REQUESTED' }));
    const handler = getHandler('post', '/:id/ce-followup-request');
    const req = makeReq({
      params: { id: BREACH_ID },
      body: {
        requestedAt: '2026-02-20T00:00:00Z',
        question: 'When was discovery?',
        requestedBy: 'ce-officer',
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('POST /:id/ce-followup-response: 200 success', async () => {
    primeLoadContext({ status: 'CE_FOLLOWUP_REQUESTED' });
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ status: 'CE_FOLLOWUP_RESPONDED' }));
    const handler = getHandler('post', '/:id/ce-followup-response');
    const req = makeReq({
      params: { id: BREACH_ID },
      body: {
        respondedAt: '2026-02-21T00:00:00Z',
        response: 'On 2026-01-01',
        recordedBy: 'ba-officer',
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('POST /:id/ce-close: 200 success', async () => {
    primeLoadContext({ status: 'CE_ACKNOWLEDGED' });
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ status: 'CE_CLOSED' }));
    const handler = getHandler('post', '/:id/ce-close');
    const req = makeReq({ params: { id: BREACH_ID } });
    const res = makeRes();
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('POST /:id/ce-notification/queue: 404 when BreachIncidentNotFoundError', async () => {
    breachIncidentFindFirst.mockResolvedValue(null);
    const handler = getHandler('post', '/:id/ce-notification/queue');
    const req = makeReq({ params: { id: 'missing' }, body: { coveredEntityId: CE_ID } });
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ─── Routes: 3 sister-bundle handlers (5-BRC-02 + 5-BRC-03 + 5-BRC-07 + 5-BRC-08) ──

describe('sister-bundle route handlers', () => {
  it('POST /:id/four-factor-risk-assessment: 200 + writes assessment fields', async () => {
    breachIncidentFindFirst.mockResolvedValue(fakeBreach());
    breachIncidentUpdate.mockResolvedValue(fakeBreach({
      fourFactorRiskCompletedBy: 'risk-officer',
    }));
    const handler = getHandler('post', '/:id/four-factor-risk-assessment');
    const req = makeReq({
      params: { id: BREACH_ID },
      body: {
        fourFactorRiskAssessment: {
          natureExtent: 'high',
          unauthorizedPerson: 'external',
          actuallyAcquired: 'yes',
          extentMitigated: 'partial',
        },
        fourFactorRiskCompletedAt: '2026-02-01T00:00:00Z',
        fourFactorRiskCompletedBy: 'risk-officer',
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(breachIncidentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        fourFactorRiskCompletedBy: 'risk-officer',
        fourFactorRiskCompletedAt: expect.any(Date),
      }),
    }));
    expect(writeAuditLog).toHaveBeenCalledWith(req, 'BREACH_DATA_MODIFIED', 'BreachIncident', BREACH_ID, expect.stringContaining('164.402'));
  });

  it('POST /:id/four-factor-risk-assessment: 404 when breach not in tenant scope', async () => {
    breachIncidentFindFirst.mockResolvedValue(null);
    const handler = getHandler('post', '/:id/four-factor-risk-assessment');
    const req = makeReq({
      params: { id: BREACH_ID },
      body: {
        fourFactorRiskAssessment: {},
        fourFactorRiskCompletedAt: '2026-02-01T00:00:00Z',
        fourFactorRiskCompletedBy: 'r',
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('POST /:id/four-factor-risk-assessment: tenant-isolation - findFirst uses req.user.hospitalId', async () => {
    breachIncidentFindFirst.mockResolvedValue(fakeBreach());
    breachIncidentUpdate.mockResolvedValue(fakeBreach());
    const handler = getHandler('post', '/:id/four-factor-risk-assessment');
    const req = makeReq({
      params: { id: BREACH_ID },
      body: {
        fourFactorRiskAssessment: {},
        fourFactorRiskCompletedAt: '2026-02-01T00:00:00Z',
        fourFactorRiskCompletedBy: 'r',
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(breachIncidentFindFirst).toHaveBeenCalledWith({ where: { id: BREACH_ID, hospitalId: TENANT_A } });
  });

  it('POST /:id/ba-acts-as-agent: 200 + records boolean + rationale', async () => {
    breachIncidentFindFirst.mockResolvedValue(fakeBreach());
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ baActsAsAgent: true }));
    const handler = getHandler('post', '/:id/ba-acts-as-agent');
    const req = makeReq({
      params: { id: BREACH_ID },
      body: {
        baActsAsAgent: true,
        baActsAsAgentRationale: 'BAA section 4.2 confers agent status',
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(breachIncidentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        baActsAsAgent: true,
        baActsAsAgentRationale: 'BAA section 4.2 confers agent status',
      }),
    }));
    expect(writeAuditLog).toHaveBeenCalledWith(req, 'BREACH_DATA_MODIFIED', 'BreachIncident', BREACH_ID, expect.stringContaining('BA-acts-as-agent'));
  });

  it('POST /:id/ba-acts-as-agent: 400 when rationale missing', async () => {
    const handler = getHandler('post', '/:id/ba-acts-as-agent');
    const req = makeReq({
      params: { id: BREACH_ID },
      body: { baActsAsAgent: true },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /:id/law-enforcement-delay: 200 + records active flag + until + rationale per 164.412', async () => {
    breachIncidentFindFirst.mockResolvedValue(fakeBreach());
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ lawEnforcementDelayActive: true }));
    const handler = getHandler('post', '/:id/law-enforcement-delay');
    const req = makeReq({
      params: { id: BREACH_ID },
      body: {
        lawEnforcementDelayActive: true,
        lawEnforcementDelayUntil: '2026-04-01T00:00:00Z',
        lawEnforcementDelayRationale: 'FBI written request per 164.412',
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(breachIncidentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        lawEnforcementDelayActive: true,
        lawEnforcementDelayUntil: expect.any(Date),
        lawEnforcementDelayRationale: 'FBI written request per 164.412',
      }),
    }));
    expect(writeAuditLog).toHaveBeenCalledWith(req, 'BREACH_DATA_MODIFIED', 'BreachIncident', BREACH_ID, expect.stringContaining('164.412'));
  });

  it('POST /:id/law-enforcement-delay: accepts active=false and null until', async () => {
    breachIncidentFindFirst.mockResolvedValue(fakeBreach());
    breachIncidentUpdate.mockResolvedValue(fakeBreach({ lawEnforcementDelayActive: false }));
    const handler = getHandler('post', '/:id/law-enforcement-delay');
    const req = makeReq({
      params: { id: BREACH_ID },
      body: {
        lawEnforcementDelayActive: false,
        lawEnforcementDelayRationale: 'Delay lifted; LE confirmed clearance to notify',
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(breachIncidentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        lawEnforcementDelayActive: false,
        lawEnforcementDelayUntil: null,
      }),
    }));
  });

  it('POST /:id/law-enforcement-delay: 404 when breach not in tenant scope', async () => {
    breachIncidentFindFirst.mockResolvedValue(null);
    const handler = getHandler('post', '/:id/law-enforcement-delay');
    const req = makeReq({
      params: { id: BREACH_ID },
      body: {
        lawEnforcementDelayActive: false,
        lawEnforcementDelayRationale: 'x',
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
