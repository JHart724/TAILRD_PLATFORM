/**
 * AUDIT-001 Tier A coverage extension for
 * backend/src/middleware/tierEnforcement.ts.
 *
 * Covers all 6 exports:
 *   - requireFeature
 *   - requireExportPermission
 *   - requirePHIAccess
 *   - enforceModuleLimit
 *   - clearTierCache
 *   - getTierInfo
 *
 * tierEnforcement.ts reads DEMO_MODE inline at call-time (not module load),
 * so DEMO_MODE bypass tests do not require jest.isolateModules. The internal
 * tierCache is cleared in beforeEach via the exported clearTierCache() helper.
 */
import type { Response, NextFunction } from 'express';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    hospital: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '../../lib/prisma';
import {
  requireFeature,
  requireExportPermission,
  requirePHIAccess,
  enforceModuleLimit,
  clearTierCache,
  getTierInfo,
} from '../tierEnforcement';

const mockHospitalFindUnique = (prisma as any).hospital.findUnique as jest.Mock;

function buildReq(user: any = undefined): any {
  return { user };
}

function buildRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { res: { status, json } as unknown as Response, status, json };
}

function userWith(overrides: any = {}): any {
  return {
    userId: 'u1',
    email: 'user@example.com',
    role: 'PHYSICIAN',
    hospitalId: 'hosp-1',
    hospitalName: 'Test',
    ...overrides,
  };
}

const FULL_MODULES_OFF = {
  moduleHeartFailure: false,
  moduleElectrophysiology: false,
  moduleStructuralHeart: false,
  moduleCoronaryIntervention: false,
  modulePeripheralVascular: false,
  moduleValvularDisease: false,
};

describe('tierEnforcement middleware - AUDIT-001 Tier A coverage extension', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    clearTierCache();
    delete process.env.DEMO_MODE;
    mockHospitalFindUnique.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category (f): requireFeature
  // ───────────────────────────────────────────────────────────────────────
  describe('requireFeature', () => {
    it('bypasses tier check when DEMO_MODE=true', async () => {
      process.env.DEMO_MODE = 'true';
      const mw = requireFeature('cql-engine');
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith({ role: 'VIEWER', hospitalId: undefined })), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
      expect(mockHospitalFindUnique).not.toHaveBeenCalled();
    });

    it('bypasses tier check for SUPER_ADMIN regardless of feature', async () => {
      const mw = requireFeature('cql-engine');
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith({ role: 'SUPER_ADMIN' })), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('rejects with 403 when user has no hospitalId', async () => {
      const mw = requireFeature('cms-benchmarks');
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith({ hospitalId: undefined })), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
      }));
    });

    it('allows BASIC tier access to a BASIC-allowed feature (cms-benchmarks)', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'BASIC',
        subscriptionActive: true,
      });
      const mw = requireFeature('cms-benchmarks');
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('allows PROFESSIONAL tier access to a PROFESSIONAL-allowed feature (therapy-gaps)', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'PROFESSIONAL',
        subscriptionActive: true,
      });
      const mw = requireFeature('therapy-gaps');
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('allows ENTERPRISE tier access to an ENTERPRISE-only feature (api-access)', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'ENTERPRISE',
        subscriptionActive: true,
      });
      const mw = requireFeature('api-access');
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('rejects BASIC tier access to PROFESSIONAL feature with required tier hint', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'BASIC',
        subscriptionActive: true,
      });
      const mw = requireFeature('therapy-gaps');
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        currentTier: 'BASIC',
        requiredTier: 'PROFESSIONAL',
      }));
    });

    it('rejects PROFESSIONAL tier access to ENTERPRISE feature with required tier hint', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'PROFESSIONAL',
        subscriptionActive: true,
      });
      const mw = requireFeature('cql-engine');
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        currentTier: 'PROFESSIONAL',
        requiredTier: 'ENTERPRISE',
      }));
    });

    it('uses cached tier on second invocation (no second DB lookup)', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'ENTERPRISE',
        subscriptionActive: true,
      });
      const mw = requireFeature('api-access');
      const next1 = jest.fn();
      const next2 = jest.fn();
      await mw(buildReq(userWith()), buildRes().res, next1);
      await mw(buildReq(userWith()), buildRes().res, next2);
      expect(next1).toHaveBeenCalledTimes(1);
      expect(next2).toHaveBeenCalledTimes(1);
      expect(mockHospitalFindUnique).toHaveBeenCalledTimes(1);
    });

    it('treats hospital with subscriptionActive=false as BASIC tier', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'ENTERPRISE',
        subscriptionActive: false,
      });
      const mw = requireFeature('api-access');
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ currentTier: 'BASIC' }));
    });

    it('treats missing hospital row as BASIC tier (fail-safe)', async () => {
      mockHospitalFindUnique.mockResolvedValue(null);
      const mw = requireFeature('therapy-gaps');
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ currentTier: 'BASIC' }));
    });

    it('falls back to BASIC tier on DB error (fail-safe)', async () => {
      mockHospitalFindUnique.mockRejectedValue(new Error('DB unreachable'));
      const mw = requireFeature('api-access');
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ currentTier: 'BASIC' }));
    });

    it('falls back to BASIC feature set when subscriptionTier is an unrecognized value', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'UNRECOGNIZED_TIER',
        subscriptionActive: true,
      });
      const mw = requireFeature('cms-benchmarks');
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category (g): requireExportPermission
  // ───────────────────────────────────────────────────────────────────────
  describe('requireExportPermission', () => {
    it('bypasses export check when DEMO_MODE=true', async () => {
      process.env.DEMO_MODE = 'true';
      const mw = requireExportPermission();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('bypasses export check for SUPER_ADMIN', async () => {
      const mw = requireExportPermission();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith({ role: 'SUPER_ADMIN' })), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('rejects with 403 when user has no hospitalId', async () => {
      const mw = requireExportPermission();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith({ hospitalId: undefined })), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
    });

    it('rejects BASIC tier export with 403 and current tier hint', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'BASIC',
        subscriptionActive: true,
      });
      const mw = requireExportPermission();
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Data export requires Professional or Enterprise subscription',
        currentTier: 'BASIC',
      }));
    });

    it('allows PROFESSIONAL tier export', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'PROFESSIONAL',
        subscriptionActive: true,
      });
      const mw = requireExportPermission();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('allows ENTERPRISE tier export', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'ENTERPRISE',
        subscriptionActive: true,
      });
      const mw = requireExportPermission();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('falls back to BASIC feature set (export denied) when subscriptionTier is unrecognized', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'UNRECOGNIZED_TIER',
        subscriptionActive: true,
      });
      const mw = requireExportPermission();
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        currentTier: 'UNRECOGNIZED_TIER',
      }));
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category (h): requirePHIAccess
  // ───────────────────────────────────────────────────────────────────────
  describe('requirePHIAccess', () => {
    it('bypasses PHI gate when DEMO_MODE=true', async () => {
      process.env.DEMO_MODE = 'true';
      const mw = requirePHIAccess();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('bypasses PHI gate for SUPER_ADMIN', async () => {
      const mw = requirePHIAccess();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith({ role: 'SUPER_ADMIN' })), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('rejects with 403 when user has no hospitalId', async () => {
      const mw = requirePHIAccess();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith({ hospitalId: undefined })), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
    });

    it('rejects BASIC tier PHI access with 403', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'BASIC',
        subscriptionActive: true,
      });
      const mw = requirePHIAccess();
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'PHI access requires a paid subscription (Professional or Enterprise)',
        currentTier: 'BASIC',
      }));
    });

    it('allows PROFESSIONAL tier PHI access', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'PROFESSIONAL',
        subscriptionActive: true,
      });
      const mw = requirePHIAccess();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('allows ENTERPRISE tier PHI access', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'ENTERPRISE',
        subscriptionActive: true,
      });
      const mw = requirePHIAccess();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('falls back to BASIC feature set (PHI denied) when subscriptionTier is unrecognized', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'UNRECOGNIZED_TIER',
        subscriptionActive: true,
      });
      const mw = requirePHIAccess();
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        currentTier: 'UNRECOGNIZED_TIER',
      }));
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category (i): enforceModuleLimit
  // ───────────────────────────────────────────────────────────────────────
  describe('enforceModuleLimit', () => {
    it('bypasses module limit when DEMO_MODE=true', async () => {
      process.env.DEMO_MODE = 'true';
      const mw = enforceModuleLimit();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('bypasses module limit for SUPER_ADMIN', async () => {
      const mw = enforceModuleLimit();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith({ role: 'SUPER_ADMIN' })), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('continues to next() when user has no hospitalId', async () => {
      const mw = enforceModuleLimit();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith({ hospitalId: undefined })), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('allows BASIC tier when active module count equals limit (1)', async () => {
      mockHospitalFindUnique
        .mockResolvedValueOnce({ subscriptionTier: 'BASIC', subscriptionActive: true })
        .mockResolvedValueOnce({
          ...FULL_MODULES_OFF,
          moduleHeartFailure: true,
        });
      const mw = enforceModuleLimit();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('rejects BASIC tier with 403 when active modules exceed limit', async () => {
      mockHospitalFindUnique
        .mockResolvedValueOnce({ subscriptionTier: 'BASIC', subscriptionActive: true })
        .mockResolvedValueOnce({
          ...FULL_MODULES_OFF,
          moduleHeartFailure: true,
          moduleElectrophysiology: true,
        });
      const mw = enforceModuleLimit();
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        currentTier: 'BASIC',
        error: expect.stringContaining('Tier BASIC allows 1 module(s)'),
      }));
    });

    it('allows PROFESSIONAL tier with 3 active modules (at limit)', async () => {
      mockHospitalFindUnique
        .mockResolvedValueOnce({ subscriptionTier: 'PROFESSIONAL', subscriptionActive: true })
        .mockResolvedValueOnce({
          ...FULL_MODULES_OFF,
          moduleHeartFailure: true,
          moduleElectrophysiology: true,
          moduleStructuralHeart: true,
        });
      const mw = enforceModuleLimit();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('rejects PROFESSIONAL tier with 4 active modules', async () => {
      mockHospitalFindUnique
        .mockResolvedValueOnce({ subscriptionTier: 'PROFESSIONAL', subscriptionActive: true })
        .mockResolvedValueOnce({
          moduleHeartFailure: true,
          moduleElectrophysiology: true,
          moduleStructuralHeart: true,
          moduleCoronaryIntervention: true,
          modulePeripheralVascular: false,
          moduleValvularDisease: false,
        });
      const mw = enforceModuleLimit();
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ currentTier: 'PROFESSIONAL' }));
    });

    it('allows ENTERPRISE tier with all 6 modules active (at limit)', async () => {
      mockHospitalFindUnique
        .mockResolvedValueOnce({ subscriptionTier: 'ENTERPRISE', subscriptionActive: true })
        .mockResolvedValueOnce({
          moduleHeartFailure: true,
          moduleElectrophysiology: true,
          moduleStructuralHeart: true,
          moduleCoronaryIntervention: true,
          modulePeripheralVascular: true,
          moduleValvularDisease: true,
        });
      const mw = enforceModuleLimit();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('continues to next() when hospital row is missing on module-count lookup', async () => {
      mockHospitalFindUnique
        .mockResolvedValueOnce({ subscriptionTier: 'BASIC', subscriptionActive: true })
        .mockResolvedValueOnce(null);
      const mw = enforceModuleLimit();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('fails open (next called) on DB error in module-count lookup', async () => {
      mockHospitalFindUnique
        .mockResolvedValueOnce({ subscriptionTier: 'BASIC', subscriptionActive: true })
        .mockRejectedValueOnce(new Error('DB error during module count'));
      const mw = enforceModuleLimit();
      const { res, status } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('falls back to BASIC limit when subscriptionTier is unrecognized', async () => {
      mockHospitalFindUnique
        .mockResolvedValueOnce({ subscriptionTier: 'UNRECOGNIZED_TIER', subscriptionActive: true })
        .mockResolvedValueOnce({
          ...FULL_MODULES_OFF,
          moduleHeartFailure: true,
          moduleElectrophysiology: true,
        });
      const mw = enforceModuleLimit();
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await mw(buildReq(userWith()), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        currentTier: 'UNRECOGNIZED_TIER',
        error: expect.stringContaining('allows 1 module(s)'),
      }));
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category (j): clearTierCache
  // ───────────────────────────────────────────────────────────────────────
  describe('clearTierCache', () => {
    it('clears the cached tier for a specific hospitalId (forces re-lookup)', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'ENTERPRISE',
        subscriptionActive: true,
      });
      const mw = requireFeature('api-access');
      await mw(buildReq(userWith({ hospitalId: 'hosp-1' })), buildRes().res, jest.fn());
      expect(mockHospitalFindUnique).toHaveBeenCalledTimes(1);

      clearTierCache('hosp-1');
      await mw(buildReq(userWith({ hospitalId: 'hosp-1' })), buildRes().res, jest.fn());
      expect(mockHospitalFindUnique).toHaveBeenCalledTimes(2);
    });

    it('clears all cached tiers when no hospitalId is supplied', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'ENTERPRISE',
        subscriptionActive: true,
      });
      const mw = requireFeature('api-access');
      await mw(buildReq(userWith({ hospitalId: 'hosp-1' })), buildRes().res, jest.fn());
      await mw(buildReq(userWith({ hospitalId: 'hosp-2' })), buildRes().res, jest.fn());
      expect(mockHospitalFindUnique).toHaveBeenCalledTimes(2);

      clearTierCache();
      await mw(buildReq(userWith({ hospitalId: 'hosp-1' })), buildRes().res, jest.fn());
      await mw(buildReq(userWith({ hospitalId: 'hosp-2' })), buildRes().res, jest.fn());
      expect(mockHospitalFindUnique).toHaveBeenCalledTimes(4);
    });

    it('is a no-op when clearing a hospitalId that is not in the cache', () => {
      expect(() => clearTierCache('hosp-never-cached')).not.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category (k): getTierInfo
  // ───────────────────────────────────────────────────────────────────────
  describe('getTierInfo', () => {
    it('returns the hospital tier and the matching feature set for ENTERPRISE', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'ENTERPRISE',
        subscriptionActive: true,
      });
      const info = await getTierInfo('hosp-1');
      expect(info.tier).toBe('ENTERPRISE');
      expect(info.features.maxModules).toBe(6);
      expect(info.features.apiAccess).toBe(true);
      expect(info.features.phiAccess).toBe(true);
      expect(info.features.exportAllowed).toBe(true);
    });

    it('returns BASIC tier and feature set for PROFESSIONAL when feature set lookup falls through to default', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'PROFESSIONAL',
        subscriptionActive: true,
      });
      const info = await getTierInfo('hosp-1');
      expect(info.tier).toBe('PROFESSIONAL');
      expect(info.features.maxModules).toBe(3);
      expect(info.features.exportAllowed).toBe(true);
      expect(info.features.apiAccess).toBe(false);
      expect(info.features.phiAccess).toBe(true);
    });

    it('returns BASIC tier fail-safe for missing hospital row', async () => {
      mockHospitalFindUnique.mockResolvedValue(null);
      const info = await getTierInfo('hosp-never-existed');
      expect(info.tier).toBe('BASIC');
      expect(info.features.maxModules).toBe(1);
      expect(info.features.apiAccess).toBe(false);
      expect(info.features.phiAccess).toBe(false);
    });

    it('returns BASIC tier fail-safe for inactive subscription', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'ENTERPRISE',
        subscriptionActive: false,
      });
      const info = await getTierInfo('hosp-1');
      expect(info.tier).toBe('BASIC');
      expect(info.features.exportAllowed).toBe(false);
      expect(info.features.phiAccess).toBe(false);
    });

    it('returns BASIC tier fail-safe on DB error', async () => {
      mockHospitalFindUnique.mockRejectedValue(new Error('DB offline'));
      const info = await getTierInfo('hosp-1');
      expect(info.tier).toBe('BASIC');
    });

    it('returns the raw tier string + BASIC feature set when subscriptionTier is unrecognized', async () => {
      mockHospitalFindUnique.mockResolvedValue({
        subscriptionTier: 'UNRECOGNIZED_TIER',
        subscriptionActive: true,
      });
      const info = await getTierInfo('hosp-1');
      expect(info.tier).toBe('UNRECOGNIZED_TIER');
      expect(info.features.maxModules).toBe(1);
      expect(info.features.apiAccess).toBe(false);
      expect(info.features.phiAccess).toBe(false);
    });
  });
});
