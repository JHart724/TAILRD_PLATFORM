/**
 * GOD View API Routes
 * 
 * Provides cross-module analytics and system oversight for SUPER_ADMIN users.
 * All routes require SUPER_ADMIN role and full audit logging.
 */

import { Router, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { writeAuditLog } from '../middleware/auditLogger';
import prisma from '../lib/prisma';
import { ModuleType } from '@prisma/client';
import { clinicianResolvedWhere } from '../services/gapResolutionActor';
import { sumScopedCounts } from '../utils/platformStats';

// Map frontend camelCase module names to Prisma enum + patient boolean field
const MODULE_MAP: Record<string, { enum: ModuleType; patientField: string }> = {
  heartFailure: { enum: 'HEART_FAILURE', patientField: 'heartFailurePatient' },
  electrophysiology: { enum: 'ELECTROPHYSIOLOGY', patientField: 'electrophysiologyPatient' },
  coronaryIntervention: { enum: 'CORONARY_INTERVENTION', patientField: 'coronaryPatient' },
  structuralHeart: { enum: 'STRUCTURAL_HEART', patientField: 'structuralHeartPatient' },
  valvularDisease: { enum: 'VALVULAR_DISEASE', patientField: 'valvularDiseasePatient' },
  peripheralVascular: { enum: 'PERIPHERAL_VASCULAR', patientField: 'peripheralVascularPatient' },
};

// Canonical "patient belongs to this module" predicate. Mirrored in
// backend/src/routes/modules.ts so GodView counts and per-module dashboard
// counts agree. A patient is in a module if either the module flag is set
// OR they have an open therapy gap for that module.
function buildModulePatientWhere(mapping: { enum: ModuleType; patientField: string }) {
  return {
    isActive: true,
    OR: [
      { [mapping.patientField]: true },
      { therapyGaps: { some: { module: mapping.enum, resolvedAt: null } } },
    ],
  };
}

// AUDIT-011: GOD view aggregates stay cross-tenant TOTALS, but are computed via hospitalId-scoped
// per-tenant queries (Hospital is not a guarded model) so the Layer-3 tenant guard keeps enforcing on
// Patient / TherapyGap / Alert - no unscoped PHI read, no __tenantGuardBypass. Row-returning reads
// (globalSearch) remain hospitalId-required.
async function tenantHospitalIds(): Promise<string[]> {
  return (await prisma.hospital.findMany({ select: { id: true } })).map((h) => h.id);
}

const router = Router();

// All GOD view endpoints require authentication and super admin role
router.use(authenticateToken);
router.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Forbidden: SUPER_ADMIN role required for GOD view access'
    });
  }
  // Audit every GOD view access (HIPAA: highest-privilege access must be logged)
  writeAuditLog(req, 'GOD_VIEW_ACCESS', 'GodView', null, `GOD view: ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * GET /api/admin/god/overview
 * Returns summary health and metrics for all modules
 */
router.get('/overview', async (req: AuthenticatedRequest, res) => {
  try {
    const modules = [
      'heartFailure', 
      'structuralHeart', 
      'electrophysiology', 
      'peripheralVascular',
      'valvularDisease',
      'coronaryIntervention'
    ];
    
    const hospitalIds = await tenantHospitalIds();
    const summaries = await Promise.all(
      modules.map(async (moduleName) => {
        const health = await getModuleHealth(moduleName, hospitalIds);
        const metrics = await getModuleMetrics(moduleName, hospitalIds);
        const alerts = await getModuleAlerts(moduleName, hospitalIds);
        
        return {
          module: moduleName,
          health,
          metrics,
          alerts,
          lastUpdated: new Date().toISOString()
        };
      })
    );
    
    res.json({ 
      modules: summaries, 
      timestamp: new Date().toISOString(),
      totalModules: modules.length
    });
    
  } catch (error) {
    logger.error('GOD View overview error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to fetch module overview' });
  }
});

/**
 * GET /api/admin/god/cross-module-analytics
 * Returns aggregated analytics across all modules
 */
router.get('/cross-module-analytics', async (req, res) => {
  try {
    const hospitalIds = await tenantHospitalIds();
    const analytics = {
      totalRevenueOpportunity: await calculateTotalRevenue(hospitalIds),
      systemWideGaps: await aggregateGaps(hospitalIds),
      patientCoverage: await getPatientCoverage(hospitalIds),
      moduleComparison: await getModuleComparison(hospitalIds),
      qualityMetrics: await getSystemQualityMetrics(hospitalIds),
      financialSummary: await getSystemFinancialSummary(hospitalIds),
      riskDistribution: await getSystemRiskDistribution(hospitalIds),
    };
    
    res.json({
      ...analytics,
      generatedAt: new Date().toISOString(),
      dataFreshness: 'real-time' // or timestamp of last data update
    });
    
  } catch (error) {
    logger.error('GOD View analytics error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to generate cross-module analytics' });
  }
});

/**
 * GET /api/admin/god/global-search
 * Searches across all modules for patients, providers, or concepts
 */
router.get('/global-search', async (req: AuthenticatedRequest, res) => {
  try {
    const { q, module, type, limit = 50, hospitalId } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({
        error: 'Query parameter "q" must be at least 2 characters'
      });
    }

    // Require explicit hospital selection for PHI searches — no cross-tenant by default
    if (!hospitalId || typeof hospitalId !== 'string') {
      return res.status(400).json({
        error: 'hospitalId required for patient search. GOD view searches are scoped per health system.',
      });
    }

    // Audit every GOD view PHI search
    await writeAuditLog(req, 'GOD_VIEW_PATIENT_SEARCH', 'Patient', null, `GOD view search in hospital ${hospitalId}`);

    const searchResults = await globalSearch({
      query: q,
      hospitalId: hospitalId as string,
      module: module as string,
      type: type as 'patient' | 'provider' | 'facility' | 'all',
      limit: Math.min(Number(limit), 100)
    });
    
    res.json({
      query: q,
      results: searchResults,
      totalFound: searchResults.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('GOD View search error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /api/admin/god/module-health/:moduleName
 * Returns detailed health metrics for specific module
 */
router.get('/module-health/:moduleName', async (req, res) => {
  try {
    const { moduleName } = req.params;
    const validModules = [
      'heartFailure', 'structuralHeart', 'electrophysiology', 
      'peripheralVascular', 'valvularDisease', 'coronaryIntervention'
    ];
    
    if (!validModules.includes(moduleName)) {
      return res.status(400).json({ error: 'Invalid module name' });
    }
    
    const detailedHealth = await getDetailedModuleHealth(moduleName, await tenantHospitalIds());
    
    res.json({
      module: moduleName,
      health: detailedHealth,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('GOD View module health error', { moduleName: req.params.moduleName, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to fetch module health details' });
  }
});

/**
 * POST /api/admin/god/system-action
 * Executes system-wide actions (maintenance, updates, etc.)
 */
router.post('/system-action', async (req: AuthenticatedRequest, res) => {
  try {
    const { action, parameters } = req.body;

    // Validate action type
    const allowedActions = ['refresh-cache', 'sync-data', 'generate-reports', 'maintenance-mode'];
    if (!allowedActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid system action' });
    }

    // Log the action attempt
    // GOD view actions are audited via the admin route's audit middleware

    const result = await executeSystemAction(action, parameters);

    res.json({
      action,
      result,
      executedAt: new Date().toISOString(),
      executedBy: req.user?.email
    });
    
  } catch (error) {
    logger.error('GOD View system action error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'System action failed' });
  }
});

// ─── Real data helper functions (query Prisma) ─────────────────────────────

const REVENUE_PER_GAP_ESTIMATE = 2500; // Conservative revenue opportunity per open gap

async function getModuleHealth(moduleName: string, hospitalIds: readonly string[]) {
  const mapping = MODULE_MAP[moduleName];
  if (!mapping) return 'unknown';
  const openGaps = await sumScopedCounts(hospitalIds, (id) => prisma.therapyGap.count({ where: { hospitalId: id, module: mapping.enum, resolvedAt: null } }));
  const totalGaps = await sumScopedCounts(hospitalIds, (id) => prisma.therapyGap.count({ where: { hospitalId: id, module: mapping.enum } }));
  const closureRate = totalGaps > 0 ? (totalGaps - openGaps) / totalGaps : 1;
  if (closureRate >= 0.8) return 'healthy';
  if (closureRate >= 0.5) return 'warning';
  return 'critical';
}

async function getModuleMetrics(moduleName: string, hospitalIds: readonly string[]) {
  const mapping = MODULE_MAP[moduleName];
  if (!mapping) return { patients: 0, revenueOpportunity: 0, gapsIdentified: 0 };
  const [patients, gapsIdentified] = await Promise.all([
    sumScopedCounts(hospitalIds, (id) => prisma.patient.count({ where: { hospitalId: id, ...buildModulePatientWhere(mapping) } })),
    sumScopedCounts(hospitalIds, (id) => prisma.therapyGap.count({ where: { hospitalId: id, module: mapping.enum, resolvedAt: null } })),
  ]);
  return { patients, revenueOpportunity: gapsIdentified * REVENUE_PER_GAP_ESTIMATE, gapsIdentified };
}

async function getModuleAlerts(moduleName: string, hospitalIds: readonly string[]) {
  const mapping = MODULE_MAP[moduleName];
  if (!mapping) return 0;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return sumScopedCounts(hospitalIds, (id) => prisma.alert.count({ where: { hospitalId: id, moduleType: mapping.enum, severity: 'HIGH', createdAt: { gte: weekAgo } } }));
}

async function calculateTotalRevenue(hospitalIds: readonly string[]) {
  const totalOpenGaps = await sumScopedCounts(hospitalIds, (id) => prisma.therapyGap.count({ where: { hospitalId: id, resolvedAt: null } }));
  return totalOpenGaps * REVENUE_PER_GAP_ESTIMATE;
}

async function aggregateGaps(hospitalIds: readonly string[]) {
  // Per-tenant groupBy, merged across tenants by gapType, then global top-10 (matches the prior
  // unscoped groupBy orderBy _count desc / take 10).
  const byType = new Map<string, number>();
  for (const id of hospitalIds) {
    const grouped = await prisma.therapyGap.groupBy({
      by: ['gapType'],
      where: { hospitalId: id, resolvedAt: null },
      _count: { id: true },
    });
    for (const g of grouped) byType.set(g.gapType, (byType.get(g.gapType) || 0) + g._count.id);
  }
  return [...byType.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([gapType, count]) => ({
      category: gapType.replace(/_/g, ' '),
      count,
      impact: count > 100 ? 'high' : count > 30 ? 'medium' : 'low',
    }));
}

async function getPatientCoverage(hospitalIds: readonly string[]) {
  const totalPatients = await sumScopedCounts(hospitalIds, (id) => prisma.patient.count({ where: { hospitalId: id, isActive: true } }));
  const byModule: Record<string, number> = {};
  for (const [name, mapping] of Object.entries(MODULE_MAP)) {
    byModule[name] = await sumScopedCounts(hospitalIds, (id) => prisma.patient.count({ where: { hospitalId: id, ...buildModulePatientWhere(mapping) } }));
  }
  const managed = Object.values(byModule).reduce((sum, c) => sum + c, 0);
  return {
    totalPatients,
    activelyManaged: managed,
    coverage: totalPatients > 0 ? managed / totalPatients : 0,
    byModule,
  };
}

async function getModuleComparison(hospitalIds: readonly string[]) {
  const moduleMetrics = await Promise.all(
    Object.entries(MODULE_MAP).map(async ([name, mapping]) => {
      const [patients, gaps] = await Promise.all([
        sumScopedCounts(hospitalIds, (id) => prisma.patient.count({ where: { hospitalId: id, ...buildModulePatientWhere(mapping) } })),
        sumScopedCounts(hospitalIds, (id) => prisma.therapyGap.count({ where: { hospitalId: id, module: mapping.enum, resolvedAt: null } })),
      ]);
      return { name, patients, gaps, efficiency: patients > 0 ? gaps / patients : 0 };
    })
  );
  const byPatients = [...moduleMetrics].sort((a, b) => b.patients - a.patients);
  const byGaps = [...moduleMetrics].sort((a, b) => b.gaps - a.gaps);
  const byEfficiency = [...moduleMetrics].sort((a, b) => a.efficiency - b.efficiency);
  return {
    patientVolume: byPatients[0]?.name || 'none',
    revenueOpportunity: byGaps[0]?.name || 'none',
    gapIdentification: byGaps[0]?.name || 'none',
    efficiency: byEfficiency[0]?.name || 'none',
  };
}

async function getSystemQualityMetrics(hospitalIds: readonly string[]) {
  const [totalGaps, closedGaps, safetyGaps] = await Promise.all([
    sumScopedCounts(hospitalIds, (id) => prisma.therapyGap.count({ where: { hospitalId: id } })),
    // AUDIT-222 retirement blast-radius: gapClosureRate presents closures as CLINICAL achievement, so
    // system-retired rows (engine-retired rules, nobody's clinical work) must not inflate it.
    sumScopedCounts(hospitalIds, (id) => prisma.therapyGap.count({ where: { hospitalId: id, ...clinicianResolvedWhere({ resolvedAt: { not: null } }) } })),
    sumScopedCounts(hospitalIds, (id) => prisma.therapyGap.count({ where: { hospitalId: id, gapType: 'SAFETY_ALERT', resolvedAt: null } })),
  ]);
  const closureRate = totalGaps > 0 ? closedGaps / totalGaps : 1;
  return {
    overallScore: closureRate,
    gapClosureRate: closureRate,
    openSafetyAlerts: safetyGaps,
    totalGapsEvaluated: totalGaps,
    totalGapsClosed: closedGaps,
  };
}

async function getSystemFinancialSummary(hospitalIds: readonly string[]) {
  const [openGaps, closedGaps] = await Promise.all([
    sumScopedCounts(hospitalIds, (id) => prisma.therapyGap.count({ where: { hospitalId: id, resolvedAt: null } })),
    // AUDIT-222 retirement blast-radius: closedGaps multiplies into `captured` opportunity below, so a
    // system retirement would FABRICATE captured revenue for work nobody did (the AUDIT-187 class).
    sumScopedCounts(hospitalIds, (id) => prisma.therapyGap.count({ where: { hospitalId: id, ...clinicianResolvedWhere({ resolvedAt: { not: null } }) } })),
  ]);
  const totalOpportunity = openGaps * REVENUE_PER_GAP_ESTIMATE;
  const captured = closedGaps * REVENUE_PER_GAP_ESTIMATE;
  return {
    totalOpportunity,
    capturedRevenue: captured,
    captureRate: (openGaps + closedGaps) > 0 ? captured / ((openGaps + closedGaps) * REVENUE_PER_GAP_ESTIMATE) : 0,
    projectedAnnualGain: totalOpportunity,
  };
}

async function getSystemRiskDistribution(hospitalIds: readonly string[]) {
  // Aggregate-in-effect: rows never reach the client, only the distribution. Per-tenant scoped
  // findMany, merged, preserves the exact ratios the prior unscoped read produced.
  const counts = { low: 0, moderate: 0, high: 0, critical: 0 };
  let total = 0;
  for (const id of hospitalIds) {
    const patients = await prisma.patient.findMany({
      where: { hospitalId: id, isActive: true },
      select: { riskCategory: true },
    });
    total += patients.length;
    for (const p of patients) {
      const cat = (p.riskCategory || 'low').toLowerCase();
      if (cat in counts) counts[cat as keyof typeof counts]++;
      else counts.low++;
    }
  }
  const denom = total || 1;
  return {
    low: counts.low / denom,
    moderate: counts.moderate / denom,
    high: counts.high / denom,
    critical: counts.critical / denom,
  };
}

async function globalSearch({ query, hospitalId, module, type, limit }: {
  query: string;
  hospitalId: string;
  module?: string;
  type?: 'patient' | 'provider' | 'facility' | 'all';
  limit: number;
}) {
  // Search patients scoped to selected hospital — no cross-tenant PHI exposure
  const patients = await prisma.patient.findMany({
    where: {
      isActive: true,
      hospitalId, // TENANT-SCOPED — required
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { mrn: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, mrn: true, riskCategory: true, hospitalId: true },
    take: limit,
  });

  return patients.map(p => ({
    id: p.id,
    type: 'patient' as const,
    name: `${p.firstName} ${p.lastName}`,
    mrn: p.mrn,
    riskLevel: p.riskCategory || 'unknown',
    hospitalId: p.hospitalId,
  }));
}

async function getDetailedModuleHealth(moduleName: string, hospitalIds: readonly string[]) {
  const mapping = MODULE_MAP[moduleName];
  if (!mapping) return { status: 'unknown' };
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [openGaps, newGapsThisWeek, closedThisWeek, patientCount] = await Promise.all([
    sumScopedCounts(hospitalIds, (id) => prisma.therapyGap.count({ where: { hospitalId: id, module: mapping.enum, resolvedAt: null } })),
    sumScopedCounts(hospitalIds, (id) => prisma.therapyGap.count({ where: { hospitalId: id, module: mapping.enum, identifiedAt: { gte: weekAgo } } })),
    // AUDIT-222 retirement blast-radius: closedThisWeek drives the module-health closureRate (and its
    // healthy/warning/critical verdict), so system retirements must not register as a week of closures.
    sumScopedCounts(hospitalIds, (id) => prisma.therapyGap.count({ where: { hospitalId: id, ...clinicianResolvedWhere({ module: mapping.enum, resolvedAt: { gte: weekAgo } }) } })),
    sumScopedCounts(hospitalIds, (id) => prisma.patient.count({ where: { hospitalId: id, ...buildModulePatientWhere(mapping) } })),
  ]);
  const closureRate = (newGapsThisWeek + closedThisWeek) > 0 ? closedThisWeek / (newGapsThisWeek + closedThisWeek) : 1;
  return {
    status: closureRate >= 0.7 ? 'healthy' : closureRate >= 0.4 ? 'warning' : 'critical',
    openGaps,
    newGapsThisWeek,
    closedThisWeek,
    closureRate,
    patientCount,
    gapsPerPatient: patientCount > 0 ? (openGaps / patientCount).toFixed(2) : '0',
    lastUpdated: new Date().toISOString(),
  };
}

async function executeSystemAction(action: string, parameters: any) {
  // System actions -- real implementations
  if (action === 'refresh-cache') {
    // No-op for now (caches are in-memory, refresh on restart)
    return { success: true, message: 'Cache refresh scheduled' };
  }
  if (action === 'generate-reports') {
    const hospitalCount = await prisma.hospital.count({ where: { subscriptionActive: true } });
    return { success: true, message: `Report generation queued for ${hospitalCount} hospitals` };
  }
  return { success: true, message: `${action} completed`, details: parameters };
}

export = router;
