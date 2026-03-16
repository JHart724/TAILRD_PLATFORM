/**
 * Subscription Tier Enforcement Middleware
 *
 * Enforces feature access based on hospital subscription tier:
 *   - BASIC:        CMS benchmark (free tier), 1 module, view-only
 *   - PROFESSIONAL:  3 modules, care execution, basic exports
 *   - ENTERPRISE:    All 6 modules, full features, API access, custom integrations
 *
 * Tiers are checked at the API layer (not just UI) to prevent unauthorized
 * access via direct API calls.
 */

import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from './auth';

// ── Tier Feature Definitions ────────────────────────────────────────────────

interface TierFeatures {
  maxModules: number;
  allowedFeatures: string[];
  maxUsers: number;
  exportAllowed: boolean;
  apiAccess: boolean;
  customIntegrations: boolean;
  phiAccess: boolean;
}

const TIER_FEATURES: Record<string, TierFeatures> = {
  BASIC: {
    maxModules: 1,
    allowedFeatures: ['cms-benchmarks', 'executive-view', 'basic-analytics'],
    maxUsers: 5,
    exportAllowed: false,
    apiAccess: false,
    customIntegrations: false,
    phiAccess: false,
  },
  PROFESSIONAL: {
    maxModules: 3,
    allowedFeatures: [
      'cms-benchmarks', 'executive-view', 'basic-analytics',
      'service-line-view', 'care-team-view', 'care-execution',
      'gdmt-optimization', 'therapy-gaps', 'phenotyping',
      'basic-export', 'alerts',
    ],
    maxUsers: 25,
    exportAllowed: true,
    apiAccess: false,
    customIntegrations: false,
    phiAccess: true,
  },
  ENTERPRISE: {
    maxModules: 6,
    allowedFeatures: [
      'cms-benchmarks', 'executive-view', 'basic-analytics',
      'service-line-view', 'care-team-view', 'care-execution',
      'gdmt-optimization', 'therapy-gaps', 'phenotyping',
      'basic-export', 'alerts', 'advanced-export',
      'api-access', 'custom-integrations', 'cross-referrals',
      'clinical-trials', 'referral-leakage', 'risk-scoring',
      'cql-engine', 'god-view',
    ],
    maxUsers: 999,
    exportAllowed: true,
    apiAccess: true,
    customIntegrations: true,
    phiAccess: true,
  },
};

// Cache hospital tiers to avoid DB lookup on every request (5 min TTL)
const tierCache = new Map<string, { tier: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getHospitalTier(hospitalId: string): Promise<string> {
  const cached = tierCache.get(hospitalId);
  if (cached && cached.expiresAt > Date.now()) return cached.tier;

  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
      select: { subscriptionTier: true, subscriptionActive: true },
    });

    if (!hospital || !hospital.subscriptionActive) return 'BASIC';

    const tier = hospital.subscriptionTier;
    tierCache.set(hospitalId, { tier, expiresAt: Date.now() + CACHE_TTL_MS });
    return tier;
  } catch {
    return 'BASIC'; // Fail-safe to most restrictive tier
  }
}

// ── Middleware Factories ────────────────────────────────────────────────────

/**
 * Require a specific feature to be available in the hospital's tier
 */
export function requireFeature(featureName: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Demo mode and super-admins bypass tier checks
    if (process.env.DEMO_MODE === 'true' || req.user?.role === 'super-admin') {
      return next();
    }

    const hospitalId = req.user?.hospitalId;
    if (!hospitalId) {
      return res.status(403).json({
        success: false,
        error: 'No hospital context — cannot verify subscription tier',
      });
    }

    const tier = await getHospitalTier(hospitalId);
    const features = TIER_FEATURES[tier] || TIER_FEATURES.BASIC;

    if (!features.allowedFeatures.includes(featureName)) {
      return res.status(403).json({
        success: false,
        error: `Feature '${featureName}' requires a higher subscription tier`,
        currentTier: tier,
        requiredTier: getMinimumTier(featureName),
      });
    }

    next();
  };
}

/**
 * Require export permission based on tier
 */
export function requireExportPermission() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (process.env.DEMO_MODE === 'true' || req.user?.role === 'super-admin') {
      return next();
    }

    const hospitalId = req.user?.hospitalId;
    if (!hospitalId) {
      return res.status(403).json({ success: false, error: 'No hospital context' });
    }

    const tier = await getHospitalTier(hospitalId);
    const features = TIER_FEATURES[tier] || TIER_FEATURES.BASIC;

    if (!features.exportAllowed) {
      return res.status(403).json({
        success: false,
        error: 'Data export requires Professional or Enterprise subscription',
        currentTier: tier,
      });
    }

    next();
  };
}

/**
 * Require PHI access permission based on tier
 * Free tier users CANNOT access any PHI at the API layer
 */
export function requirePHIAccess() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (process.env.DEMO_MODE === 'true' || req.user?.role === 'super-admin') {
      return next();
    }

    const hospitalId = req.user?.hospitalId;
    if (!hospitalId) {
      return res.status(403).json({ success: false, error: 'No hospital context' });
    }

    const tier = await getHospitalTier(hospitalId);
    const features = TIER_FEATURES[tier] || TIER_FEATURES.BASIC;

    if (!features.phiAccess) {
      return res.status(403).json({
        success: false,
        error: 'PHI access requires a paid subscription (Professional or Enterprise)',
        currentTier: tier,
      });
    }

    next();
  };
}

/**
 * Enforce maximum module count for hospital's tier
 */
export function enforceModuleLimit() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (process.env.DEMO_MODE === 'true' || req.user?.role === 'super-admin') {
      return next();
    }

    const hospitalId = req.user?.hospitalId;
    if (!hospitalId) return next();

    const tier = await getHospitalTier(hospitalId);
    const features = TIER_FEATURES[tier] || TIER_FEATURES.BASIC;

    // Count active modules for hospital
    try {
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: {
          moduleHeartFailure: true,
          moduleElectrophysiology: true,
          moduleStructuralHeart: true,
          moduleCoronaryIntervention: true,
          modulePeripheralVascular: true,
          moduleValvularDisease: true,
        },
      });

      if (!hospital) return next();

      const activeModules = [
        hospital.moduleHeartFailure,
        hospital.moduleElectrophysiology,
        hospital.moduleStructuralHeart,
        hospital.moduleCoronaryIntervention,
        hospital.modulePeripheralVascular,
        hospital.moduleValvularDisease,
      ].filter(Boolean).length;

      if (activeModules > features.maxModules) {
        return res.status(403).json({
          success: false,
          error: `Tier ${tier} allows ${features.maxModules} module(s), but ${activeModules} are active`,
          currentTier: tier,
        });
      }
    } catch {
      // Fail open for this check — don't block on DB errors
    }

    next();
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getMinimumTier(featureName: string): string {
  if (TIER_FEATURES.BASIC.allowedFeatures.includes(featureName)) return 'BASIC';
  if (TIER_FEATURES.PROFESSIONAL.allowedFeatures.includes(featureName)) return 'PROFESSIONAL';
  return 'ENTERPRISE';
}

// Clear tier cache (for testing or when subscription changes)
export function clearTierCache(hospitalId?: string): void {
  if (hospitalId) {
    tierCache.delete(hospitalId);
  } else {
    tierCache.clear();
  }
}

// Get tier info for a hospital (for admin dashboard)
export async function getTierInfo(hospitalId: string): Promise<{
  tier: string;
  features: TierFeatures;
}> {
  const tier = await getHospitalTier(hospitalId);
  return { tier, features: TIER_FEATURES[tier] || TIER_FEATURES.BASIC };
}
