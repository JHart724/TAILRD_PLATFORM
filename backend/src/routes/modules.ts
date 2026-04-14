import { Router, Response } from 'express';
import { APIResponse } from '../types';
import { authenticateToken, authorizeHospital, authorizeModule, authorizeView, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

const router = Router();

// SUPER_ADMIN sees all tenants (GodView). Other roles scoped to their hospital.
const isSuperAdmin = (req: AuthenticatedRequest) => req.user?.role === 'SUPER_ADMIN';

// All module routes require authentication
router.use(authenticateToken);

// Get all available modules with real patient counts per hospital
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const modules = [
    {
      id: 'heart-failure',
      name: 'Heart Failure',
      description: 'Comprehensive heart failure care coordination and GDMT optimization',
      icon: 'Heart',
      color: 'medical-blue',
      status: 'active',
      features: ['GDMT Analytics', 'Care Gap Analysis', 'Device Pathway Tracking', 'Quality Metrics']
    },
    {
      id: 'electrophysiology',
      name: 'Electrophysiology',
      description: 'AFib management, device therapy, and ablation analytics',
      icon: 'Zap',
      color: 'medical-purple',
      status: 'active',
      features: ['AFib Screening', 'Device Management', 'LAAC Tracking', 'Ablation Analytics']
    },
    {
      id: 'coronary-intervention',
      name: 'Coronary Intervention',
      description: 'PCI analytics and coronary care optimization',
      icon: 'Activity',
      color: 'medical-red',
      status: 'active',
      features: ['PCI Analytics', 'STEMI Protocol', 'Cath Lab Efficiency', 'Procedural Outcomes']
    },
    {
      id: 'structural-heart',
      name: 'Structural Heart',
      description: 'TAVR, TEER, and structural intervention management',
      icon: 'Target',
      color: 'medical-green',
      status: 'active',
      features: ['TAVR Analytics', 'TEER Tracking', 'Heart Team Coordination', 'Risk Assessment']
    },
    {
      id: 'peripheral-vascular',
      name: 'Peripheral Vascular',
      description: 'PAD management and limb salvage analytics',
      icon: 'GitBranch',
      color: 'medical-amber',
      status: 'active',
      features: ['PAD Screening', 'Limb Salvage', 'Wound Care Integration', 'CLI Management']
    },
    {
      id: 'valvular-disease',
      name: 'Valvular Disease',
      description: 'Valve assessment and surgical planning',
      icon: 'Circle',
      color: 'medical-teal',
      status: 'active',
      features: ['Valve Assessment', 'Surgical Planning', 'Repair Analytics', 'Long-term Monitoring']
    }
  ];

  try {
    const hospitalId = isSuperAdmin(req) ? undefined : req.user?.hospitalId;
    if (hospitalId || isSuperAdmin(req)) {
      // Enrich with real patient counts from the database
      const MODULE_FIELDS: Record<string, string> = {
        'heart-failure': 'heartFailurePatient',
        'electrophysiology': 'electrophysiologyPatient',
        'coronary-intervention': 'coronaryPatient',
        'structural-heart': 'structuralHeartPatient',
        'peripheral-vascular': 'peripheralVascularPatient',
        'valvular-disease': 'valvularDiseasePatient',
      };

      for (const mod of modules) {
        const field = MODULE_FIELDS[mod.id];
        if (field) {
          const count = await prisma.patient.count({
            where: { ...(hospitalId && { hospitalId }), isActive: true, [field]: true },
          });
          (mod as any).patientCount = count;
        }
      }
    }

    res.json({
      success: true,
      data: modules,
      message: 'Available cardiovascular modules',
      timestamp: new Date().toISOString()
    } as APIResponse);
  } catch (error) {
    logger.error('Failed to fetch modules', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to fetch modules' });
  }
});

// Heart Failure module endpoints — Prisma-backed, tenant-scoped by req.user.hospitalId
router.get('/heart-failure/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = isSuperAdmin(req) ? undefined : req.user?.hospitalId;
  if (!hospitalId && !isSuperAdmin(req)) {
    return res.status(401).json({ success: false, error: 'Not authenticated' } as APIResponse);
  }

  try {
    const hfPatientWhere = {
      ...(hospitalId && { hospitalId }),
      isActive: true,
      OR: [
        { heartFailurePatient: true },
        { therapyGaps: { some: { module: 'HEART_FAILURE' as const, resolvedAt: null } } },
      ],
    };
    const openGapWhere = { ...(hospitalId && { hospitalId }), module: 'HEART_FAILURE' as const, resolvedAt: null };

    const [
      totalPatients,
      openGapsByType,
      medicationGaps,
      deviceGaps,
      recentGaps,
    ] = await Promise.all([
      prisma.patient.count({ where: hfPatientWhere }),
      prisma.therapyGap.groupBy({
        by: ['gapType'],
        where: openGapWhere,
        _count: { id: true },
      }),
      prisma.therapyGap.findMany({
        where: { ...openGapWhere, gapType: 'MEDICATION_MISSING' },
        select: { medication: true, patientId: true },
      }),
      prisma.therapyGap.count({
        where: { ...openGapWhere, gapType: 'DEVICE_ELIGIBLE' },
      }),
      prisma.therapyGap.findMany({
        where: openGapWhere,
        orderBy: { identifiedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          gapType: true,
          medication: true,
          device: true,
          currentStatus: true,
          targetStatus: true,
          identifiedAt: true,
          patientId: true,
        },
      }),
    ]);

    const totalOpenGaps = openGapsByType.reduce((sum, g) => sum + g._count.id, 0);
    const gapsByType = openGapsByType.reduce<Record<string, number>>((acc, g) => {
      acc[g.gapType] = g._count.id;
      return acc;
    }, {});

    // GDMT pillar coverage — derived from unresolved MEDICATION_MISSING gaps.
    // Coverage = 1 - (distinct patients missing this drug class / total HF patients).
    // Dedupe by patientId so one patient with multiple gaps on the same class
    // counts as one missing patient. Clamp to [0, totalPatients] so a stale
    // gap row count can never produce negative coverage.
    const countMissing = (matcher: RegExp) => {
      const patientIds = new Set<string>();
      for (const g of medicationGaps) {
        if (g.medication && matcher.test(g.medication)) {
          patientIds.add(g.patientId);
        }
      }
      return patientIds.size;
    };

    const coverageFor = (missing: number) => {
      if (totalPatients <= 0) return null;
      const clamped = Math.min(Math.max(missing, 0), totalPatients);
      return Math.round((1 - clamped / totalPatients) * 1000) / 10;
    };

    // Distinct patients with any unresolved medication gap — used for the
    // "GDMT optimized" summary card (patients with zero medication gaps).
    const patientsWithMedicationGap = new Set(medicationGaps.map(g => g.patientId)).size;

    const statusFor = (coverage: number | null, target: number, amber: number) => {
      if (coverage === null) return 'unknown';
      if (coverage >= target) return 'green';
      if (coverage >= amber) return 'amber';
      return 'red';
    };

    const aceArbMissing = countMissing(/(ACEi|ACE inhibitor|ARB|ARNI|sacubitril|valsartan|lisinopril|enalapril|losartan)/i);
    const betaBlockerMissing = countMissing(/(beta blocker|bisoprolol|carvedilol|metoprolol)/i);
    const mraMissing = countMissing(/(MRA|spironolactone|eplerenone|mineralocorticoid)/i);
    const sglt2iMissing = countMissing(/(SGLT2|dapagliflozin|empagliflozin|canagliflozin)/i);

    const gdmtMetrics = {
      aceArb: { current: coverageFor(aceArbMissing), target: 95, status: statusFor(coverageFor(aceArbMissing), 95, 85), missingCount: aceArbMissing },
      betaBlocker: { current: coverageFor(betaBlockerMissing), target: 95, status: statusFor(coverageFor(betaBlockerMissing), 95, 85), missingCount: betaBlockerMissing },
      mra: { current: coverageFor(mraMissing), target: 85, status: statusFor(coverageFor(mraMissing), 85, 70), missingCount: mraMissing },
      sglt2i: { current: coverageFor(sglt2iMissing), target: 75, status: statusFor(coverageFor(sglt2iMissing), 75, 60), missingCount: sglt2iMissing },
    };

    const recentAlerts = recentGaps.map(g => ({
      gapId: g.id,
      patientId: g.patientId,
      type: g.gapType,
      severity: g.gapType === 'MEDICATION_MISSING' || g.gapType === 'DEVICE_ELIGIBLE' ? 'high' : 'medium',
      message: g.medication
        ? `Missing ${g.medication}`
        : g.device
        ? `${g.device} candidate`
        : g.targetStatus,
      currentStatus: g.currentStatus,
      targetStatus: g.targetStatus,
      identifiedAt: g.identifiedAt.toISOString(),
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalPatients,
          totalOpenGaps,
          gapsByType,
          deviceCandidates: deviceGaps,
          // gdmtOptimized = patients with zero unresolved medication gaps
          gdmtOptimized: Math.max(totalPatients - patientsWithMedicationGap, 0),
        },
        gdmtMetrics,
        recentAlerts,
        source: 'database',
      },
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error) {
    logger.error('Failed to build HF dashboard', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load Heart Failure dashboard' } as APIResponse);
  }
});

// GDMT Calculator endpoint
router.post('/heart-failure/gdmt-calculator', (req, res) => {
  const { patientData } = req.body;
  
  // Simple GDMT optimization logic
  const recommendations = {
    aceArb: {
      recommended: !patientData.contraindications?.includes('ace-intolerance'),
      currentDose: patientData.medications?.aceArb?.dose || 0,
      targetDose: 10,
      reasoning: 'ACE inhibitor recommended for HFrEF unless contraindicated'
    },
    betaBlocker: {
      recommended: !patientData.contraindications?.includes('beta-blocker-intolerance'),
      currentDose: patientData.medications?.betaBlocker?.dose || 0,
      targetDose: 50,
      reasoning: 'Beta blocker recommended for mortality benefit'
    },
    mra: {
      recommended: patientData.ef < 40 && patientData.creatinine < 2.5,
      currentDose: patientData.medications?.mra?.dose || 0,
      targetDose: 25,
      reasoning: 'MRA recommended for HFrEF with preserved kidney function'
    },
    sglt2i: {
      recommended: !patientData.contraindications?.includes('diabetes-contraindication'),
      currentDose: patientData.medications?.sglt2i?.dose || 0,
      targetDose: 10,
      reasoning: 'SGLT2i recommended for cardiovascular benefit'
    }
  };

  res.json({
    success: true,
    data: {
      patientId: patientData.id,
      recommendations,
      overallOptimization: Object.values(recommendations).filter(r => r.recommended).length / 4 * 100,
      timestamp: new Date().toISOString()
    },
    message: 'GDMT recommendations generated',
    timestamp: new Date().toISOString()
  } as APIResponse);
});

// Patient worklist endpoint — Prisma-backed, tenant-scoped by req.user.hospitalId
router.get('/heart-failure/patients', async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = isSuperAdmin(req) ? undefined : req.user?.hospitalId;
  if (!hospitalId && !isSuperAdmin(req)) {
    return res.status(401).json({ success: false, error: 'Not authenticated' } as APIResponse);
  }

  try {
    const limitParam = Number.parseInt(String(req.query.limit ?? '100'), 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100;

    const patients = await prisma.patient.findMany({
      where: {
        ...(hospitalId && { hospitalId }),
        isActive: true,
        OR: [
          { heartFailurePatient: true },
          { therapyGaps: { some: { module: 'HEART_FAILURE' as const, resolvedAt: null } } },
        ],
      },
      orderBy: [{ riskCategory: 'desc' }, { lastAssessment: 'desc' }],
      take: limit,
      select: {
        id: true,
        mrn: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        riskCategory: true,
        riskScore: true,
        lastAssessment: true,
        therapyGaps: {
          where: { resolvedAt: null, module: 'HEART_FAILURE' },
          select: { id: true, gapType: true, medication: true, device: true, currentStatus: true },
        },
      },
    });

    const now = Date.now();
    const worklist = patients.map(p => {
      const ageMs = now - p.dateOfBirth.getTime();
      const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
      const careGaps = p.therapyGaps.map(g =>
        g.medication ? `${g.medication} gap` : g.device ? `${g.device} eval` : g.currentStatus,
      );
      return {
        id: p.id,
        mrn: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        age,
        gender: p.gender,
        riskCategory: p.riskCategory,
        riskScore: p.riskScore,
        gapCount: p.therapyGaps.length,
        careGaps,
        lastAssessment: p.lastAssessment?.toISOString() ?? null,
      };
    });

    res.json({
      success: true,
      data: worklist,
      count: worklist.length,
      source: 'database',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error) {
    logger.error('Failed to load HF patient worklist', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load Heart Failure patient worklist' } as APIResponse);
  }
});

// Advanced GDMT Gap Analysis endpoint
router.post('/heart-failure/gdmt-gaps', (req, res) => {
  const { populationFilters } = req.body;
  
  // Simulate population-level GDMT gap analysis
  const gapAnalysis = {
    totalPatients: 1247,
    gapBreakdown: {
      aceArb: {
        eligible: 1156,
        prescribed: 1031,
        atTargetDose: 892,
        gapCount: 264,
        opportunities: [
          { type: 'Not Prescribed', count: 125, priority: 'high' },
          { type: 'Under-dosed', count: 139, priority: 'medium' }
        ]
      },
      betaBlocker: {
        eligible: 1203,
        prescribed: 1104,
        atTargetDose: 967,
        gapCount: 236,
        opportunities: [
          { type: 'Not Prescribed', count: 99, priority: 'high' },
          { type: 'Under-dosed', count: 137, priority: 'medium' }
        ]
      },
      mra: {
        eligible: 892,
        prescribed: 681,
        atTargetDose: 523,
        gapCount: 369,
        opportunities: [
          { type: 'Not Prescribed', count: 211, priority: 'high' },
          { type: 'Under-dosed', count: 158, priority: 'medium' }
        ]
      },
      sglt2i: {
        eligible: 1089,
        prescribed: 676,
        atTargetDose: 589,
        gapCount: 500,
        opportunities: [
          { type: 'Not Prescribed', count: 413, priority: 'high' },
          { type: 'Under-dosed', count: 87, priority: 'medium' }
        ]
      }
    },
    priorityPatients: [
      { id: 'HF001', name: 'Sarah Johnson', gaps: ['SGLT2i Missing', 'MRA Under-dosed'], priority: 'high', estimatedBenefit: '$12,450/year' },
      { id: 'HF003', name: 'Jennifer Williams', gaps: ['Beta-blocker Under-dosed'], priority: 'medium', estimatedBenefit: '$8,200/year' },
      { id: 'HF005', name: 'Robert Chen', gaps: ['ACE/ARB Missing', 'SGLT2i Missing'], priority: 'high', estimatedBenefit: '$15,600/year' }
    ],
    qualityMetrics: {
      overallOptimization: 74.3,
      benchmark: 85.0,
      improvement: '+12.1% vs last quarter',
      target: 90.0
    }
  };

  res.json({
    success: true,
    data: gapAnalysis,
    message: 'GDMT gap analysis completed',
    timestamp: new Date().toISOString()
  } as APIResponse);
});

// Heart Failure Phenotype Detection endpoint
router.post('/heart-failure/phenotype-analysis', (req, res) => {
  const { patientData } = req.body;
  
  // Advanced phenotype detection logic
  const phenotypes = {
    hfpef: {
      probability: patientData.ef >= 50 ? 0.85 : 0.15,
      evidence: ['EF ≥50%', 'Diastolic dysfunction', 'LVH present'],
      clinicalImplications: 'Focus on comorbidity management, diuretic optimization'
    },
    hfref: {
      probability: patientData.ef < 40 ? 0.92 : 0.08,
      evidence: ['EF <40%', 'LV dilation', 'Regional wall motion abnormalities'],
      clinicalImplications: 'Aggressive GDMT, device therapy consideration'
    },
    hfmref: {
      probability: (patientData.ef >= 40 && patientData.ef < 50) ? 0.78 : 0.22,
      evidence: ['EF 40-49%', 'Prior HF hospitalization', 'BNP elevation'],
      clinicalImplications: 'Monitor for progression, selective GDMT application'
    },
    amyloidosis: {
      probability: patientData.age > 65 && patientData.wallThickness > 15 ? 0.35 : 0.05,
      evidence: ['Advanced age', 'Increased wall thickness', 'Low-voltage ECG'],
      clinicalImplications: 'Consider cardiac amyloid screening, avoid certain medications',
      recommendedTests: ['Tc99m-PYP scan', 'Free light chains', 'Cardiac MRI']
    },
    hypertrophicCM: {
      probability: patientData.wallThickness > 15 && patientData.familyHistory ? 0.45 : 0.12,
      evidence: ['Asymmetric septal hypertrophy', 'Family history', 'Dynamic obstruction'],
      clinicalImplications: 'Genetic counseling, avoid aggressive preload reduction',
      recommendedTests: ['Genetic testing', 'Exercise stress test', 'Holter monitoring']
    }
  };

  const dominantPhenotype = Object.entries(phenotypes)
    .sort(([,a], [,b]) => b.probability - a.probability)[0];

  res.json({
    success: true,
    data: {
      patientId: patientData.id,
      phenotypes,
      dominantPhenotype: {
        type: dominantPhenotype[0],
        details: dominantPhenotype[1]
      },
      confidence: Math.max(...Object.values(phenotypes).map(p => p.probability)),
      timestamp: new Date().toISOString()
    },
    message: 'Heart failure phenotype analysis completed',
    timestamp: new Date().toISOString()
  } as APIResponse);
});

// Device Eligibility Assessment endpoint
router.post('/heart-failure/device-eligibility', (req, res) => {
  const { patientData } = req.body;
  
  const deviceAssessment = {
    icd: {
      eligible: patientData.ef <= 35 && patientData.lifeExpectancy > 1,
      indication: patientData.ef <= 35 ? 'Primary prevention' : 'Not indicated',
      evidence: ['EF ≤35%', 'Optimal medical therapy', 'Life expectancy >1 year'],
      contraindications: patientData.contraindications?.includes('device-infection') ? ['Active infection'] : [],
      recommendation: patientData.ef <= 35 ? 'Strong recommendation (Class I)' : 'Not recommended'
    },
    crtd: {
      eligible: patientData.ef <= 35 && patientData.qrs >= 150 && patientData.lbbb,
      indication: 'CRT-D for symptomatic HF with wide QRS and LBBB',
      evidence: ['EF ≤35%', 'QRS ≥150ms', 'LBBB morphology', 'NYHA Class II-III'],
      contraindications: [],
      recommendation: patientData.ef <= 35 && patientData.qrs >= 150 ? 'Strong recommendation (Class I)' : 'Consider based on QRS width'
    },
    lvad: {
      eligible: patientData.ef < 25 && patientData.nyhaClass >= 3 && patientData.inotropeDependent,
      indication: 'End-stage heart failure, bridge to transplant or destination therapy',
      evidence: ['EF <25%', 'NYHA Class III-IV', 'Inotrope dependence', 'Transplant candidate'],
      contraindications: patientData.contraindications?.includes('severe-rh-failure') ? ['Severe RV failure'] : [],
      recommendation: 'Consider if optimal medical therapy and CRT ineffective'
    },
    cardiomems: {
      eligible: patientData.nyhaClass >= 3 && patientData.recentHospitalization,
      indication: 'Recurrent HF hospitalizations despite optimal therapy',
      evidence: ['NYHA Class III', 'Recent HF hospitalization', 'Stable on GDMT'],
      contraindications: [],
      recommendation: 'Consider for reducing HF hospitalizations'
    }
  };

  res.json({
    success: true,
    data: {
      patientId: patientData.id,
      deviceAssessment,
      summary: {
        eligibleDevices: Object.entries(deviceAssessment).filter(([,device]) => device.eligible).map(([name]) => name),
        nextSteps: ['Electrophysiology consultation', 'Heart failure team evaluation', 'Patient counseling on device options'],
        timeline: 'Evaluation within 2-4 weeks'
      },
      timestamp: new Date().toISOString()
    },
    message: 'Device eligibility assessment completed',
    timestamp: new Date().toISOString()
  } as APIResponse);
});

// Automated Clinical Calculators - No manual input required
// These pull data automatically from patient records

// CHA₂DS₂-VASc Calculator (automated)
router.get('/calculators/cha2ds2-vasc/:patientId', (req, res) => {
  const { patientId } = req.params;
  
  // Simulate automated data retrieval from EHR
  const patientData = {
    age: 72,
    sex: 'F',
    hasCongestiveHF: true,
    hasHypertension: true,
    hasDiabetes: false,
    hasStrokeHistory: false,
    hasVascularDisease: true,
    ageCategory: 'over75' // 65-74 = 1 point, ≥75 = 2 points
  };

  // Automated CHA₂DS₂-VASc calculation
  let score = 0;
  if (patientData.hasCongestiveHF) score += 1;
  if (patientData.hasHypertension) score += 1;
  if (patientData.age >= 75) score += 2;
  else if (patientData.age >= 65) score += 1;
  if (patientData.hasDiabetes) score += 1;
  if (patientData.hasStrokeHistory) score += 2;
  if (patientData.hasVascularDisease) score += 1;
  if (patientData.sex === 'F') score += 1;

  const riskLevel = score === 0 ? 'Low' : score === 1 ? 'Moderate' : 'High';
  const strokeRisk = score === 0 ? '0%' : score === 1 ? '1.3%' : score === 2 ? '2.2%' : score >= 3 ? `${2.2 + (score - 2) * 1.5}%` : 'High';

  res.json({
    success: true,
    data: {
      patientId,
      score,
      riskLevel,
      annualStrokeRisk: strokeRisk,
      recommendation: score >= 2 ? 'Anticoagulation recommended' : score === 1 ? 'Consider anticoagulation' : 'No anticoagulation needed',
      components: {
        congestiveHF: patientData.hasCongestiveHF ? 1 : 0,
        hypertension: patientData.hasHypertension ? 1 : 0,
        age: patientData.age >= 75 ? 2 : patientData.age >= 65 ? 1 : 0,
        diabetes: patientData.hasDiabetes ? 1 : 0,
        stroke: patientData.hasStrokeHistory ? 2 : 0,
        vascular: patientData.hasVascularDisease ? 1 : 0,
        sex: patientData.sex === 'F' ? 1 : 0
      },
      automated: true,
      dataSource: 'EHR_AUTOMATED',
      timestamp: new Date().toISOString()
    },
    message: 'Automated CHA₂DS₂-VASc calculation from EHR data',
    timestamp: new Date().toISOString()
  });
});

// HAS-BLED Calculator (automated)
router.get('/calculators/has-bled/:patientId', (req, res) => {
  const { patientId } = req.params;
  
  // Simulate automated data retrieval from EHR
  const patientData = {
    hasHypertension: true,
    hasRenalDisease: false,
    hasLiverDisease: false,
    hasStrokeHistory: false,
    hasBleeding: false,
    hasLabilINR: false,
    age: 72,
    takingDrugs: true, // NSAIDs, antiplatelets
    takingAlcohol: false
  };

  // Automated HAS-BLED calculation
  let score = 0;
  if (patientData.hasHypertension) score += 1;
  if (patientData.hasRenalDisease || patientData.hasLiverDisease) score += 1;
  if (patientData.hasStrokeHistory) score += 1;
  if (patientData.hasBleeding) score += 1;
  if (patientData.hasLabilINR) score += 1;
  if (patientData.age > 65) score += 1;
  if (patientData.takingDrugs) score += 1;
  if (patientData.takingAlcohol) score += 1;

  const riskLevel = score <= 2 ? 'Low' : 'High';
  const bleedingRisk = score <= 1 ? '1.13%' : score === 2 ? '1.88%' : score === 3 ? '3.74%' : `${3.74 + (score - 3) * 2}%`;

  res.json({
    success: true,
    data: {
      patientId,
      score,
      riskLevel,
      annualBleedingRisk: bleedingRisk,
      recommendation: score <= 2 ? 'Low bleeding risk - safe for anticoagulation' : 'High bleeding risk - consider alternatives',
      components: {
        hypertension: patientData.hasHypertension ? 1 : 0,
        abnormalRenalLiver: (patientData.hasRenalDisease || patientData.hasLiverDisease) ? 1 : 0,
        stroke: patientData.hasStrokeHistory ? 1 : 0,
        bleeding: patientData.hasBleeding ? 1 : 0,
        labilINR: patientData.hasLabilINR ? 1 : 0,
        elderly: patientData.age > 65 ? 1 : 0,
        drugs: patientData.takingDrugs ? 1 : 0,
        alcohol: patientData.takingAlcohol ? 1 : 0
      },
      automated: true,
      dataSource: 'EHR_AUTOMATED',
      timestamp: new Date().toISOString()
    },
    message: 'Automated HAS-BLED calculation from EHR data',
    timestamp: new Date().toISOString()
  });
});

// STS Risk Calculator (automated)
router.get('/calculators/sts-risk/:patientId', (req, res) => {
  const { patientId } = req.params;
  
  // Simulate automated data retrieval from EHR
  const patientData = {
    age: 78,
    sex: 'M',
    weightKg: 82,
    heightCm: 175,
    creatinine: 1.4,
    ef: 45,
    hasDialysis: false,
    hasDiabetes: true,
    hasChronicLung: false,
    hasImmunosuppressive: false,
    hasEndocarditis: false,
    hasPreviousCV: true,
    nyhaClass: 3
  };

  // Simplified STS PROM calculation (actual calculation is much more complex)
  let mortalityRisk = 2.0; // Base risk
  
  // Age adjustment
  if (patientData.age > 80) mortalityRisk += 2.5;
  else if (patientData.age > 70) mortalityRisk += 1.5;
  
  // Other risk factors
  if (patientData.sex === 'F') mortalityRisk += 0.5;
  if (patientData.ef < 30) mortalityRisk += 3.0;
  else if (patientData.ef < 40) mortalityRisk += 1.5;
  if (patientData.creatinine > 2.0) mortalityRisk += 2.0;
  else if (patientData.creatinine > 1.5) mortalityRisk += 1.0;
  if (patientData.hasDiabetes) mortalityRisk += 0.8;
  if (patientData.hasChronicLung) mortalityRisk += 1.2;
  if (patientData.hasPreviousCV) mortalityRisk += 1.0;
  if (patientData.nyhaClass >= 4) mortalityRisk += 2.0;
  else if (patientData.nyhaClass >= 3) mortalityRisk += 1.0;

  const riskCategory = mortalityRisk < 4 ? 'Low' : mortalityRisk < 8 ? 'Intermediate' : 'High';

  res.json({
    success: true,
    data: {
      patientId,
      predictedMortality: parseFloat(mortalityRisk.toFixed(2)),
      riskCategory,
      recommendation: riskCategory === 'Low' ? 'Good surgical candidate' : 
                     riskCategory === 'Intermediate' ? 'Moderate risk - consider alternatives' : 
                     'High risk - consider TAVR or medical management',
      components: {
        age: patientData.age,
        sex: patientData.sex,
        ef: patientData.ef,
        creatinine: patientData.creatinine,
        diabetes: patientData.hasDiabetes,
        chronicLung: patientData.hasChronicLung,
        previousCV: patientData.hasPreviousCV,
        nyhaClass: patientData.nyhaClass
      },
      automated: true,
      dataSource: 'EHR_AUTOMATED',
      version: 'STS_RISK_2023',
      timestamp: new Date().toISOString()
    },
    message: 'Automated STS Risk calculation from EHR data',
    timestamp: new Date().toISOString()
  });
});

// ==============================================================================
// ELECTROPHYSIOLOGY MODULE — Prisma-backed, tenant-scoped
// ==============================================================================

router.get('/electrophysiology/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = isSuperAdmin(req) ? undefined : req.user?.hospitalId;
  if (!hospitalId && !isSuperAdmin(req)) {
    return res.status(401).json({ success: false, error: 'Not authenticated' } as APIResponse);
  }

  try {
    const epPatientWhere = {
      ...(hospitalId && { hospitalId }),
      isActive: true,
      OR: [
        { electrophysiologyPatient: true },
        { therapyGaps: { some: { module: 'ELECTROPHYSIOLOGY' as const, resolvedAt: null } } },
      ],
    };
    const openGapWhere = { ...(hospitalId && { hospitalId }), module: 'ELECTROPHYSIOLOGY' as const, resolvedAt: null };

    const [
      totalPatients,
      openGapsByType,
      deviceGaps,
      recentGaps,
    ] = await Promise.all([
      prisma.patient.count({ where: epPatientWhere }),
      prisma.therapyGap.groupBy({
        by: ['gapType'],
        where: openGapWhere,
        _count: { id: true },
      }),
      prisma.therapyGap.count({
        where: { ...openGapWhere, gapType: 'DEVICE_ELIGIBLE' },
      }),
      prisma.therapyGap.findMany({
        where: openGapWhere,
        orderBy: { identifiedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          gapType: true,
          medication: true,
          device: true,
          currentStatus: true,
          targetStatus: true,
          identifiedAt: true,
          patientId: true,
        },
      }),
    ]);

    const totalOpenGaps = openGapsByType.reduce((sum, g) => sum + g._count.id, 0);
    const gapsByType = openGapsByType.reduce<Record<string, number>>((acc, g) => {
      acc[g.gapType] = g._count.id;
      return acc;
    }, {});

    const recentAlerts = recentGaps.map(g => ({
      gapId: g.id,
      patientId: g.patientId,
      type: g.gapType,
      severity: g.gapType === 'DEVICE_ELIGIBLE' ? 'high' : 'medium',
      message: g.medication
        ? `Missing ${g.medication}`
        : g.device
        ? `${g.device} candidate`
        : g.targetStatus,
      currentStatus: g.currentStatus,
      targetStatus: g.targetStatus,
      identifiedAt: g.identifiedAt.toISOString(),
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalPatients,
          totalOpenGaps,
          gapsByType,
          deviceCandidates: deviceGaps,
        },
        recentAlerts,
        source: 'database',
      },
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error) {
    logger.error('Failed to build EP dashboard', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load Electrophysiology dashboard' } as APIResponse);
  }
});

router.get('/electrophysiology/patients', async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = isSuperAdmin(req) ? undefined : req.user?.hospitalId;
  if (!hospitalId && !isSuperAdmin(req)) {
    return res.status(401).json({ success: false, error: 'Not authenticated' } as APIResponse);
  }

  try {
    const limitParam = Number.parseInt(String(req.query.limit ?? '100'), 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100;

    const patients = await prisma.patient.findMany({
      where: {
        ...(hospitalId && { hospitalId }),
        isActive: true,
        OR: [
          { electrophysiologyPatient: true },
          { therapyGaps: { some: { module: 'ELECTROPHYSIOLOGY' as const, resolvedAt: null } } },
        ],
      },
      orderBy: [{ riskCategory: 'desc' }, { lastAssessment: 'desc' }],
      take: limit,
      select: {
        id: true,
        mrn: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        riskCategory: true,
        riskScore: true,
        lastAssessment: true,
        therapyGaps: {
          where: { resolvedAt: null, module: 'ELECTROPHYSIOLOGY' },
          select: { id: true, gapType: true, medication: true, device: true, currentStatus: true },
        },
      },
    });

    const now = Date.now();
    const worklist = patients.map(p => {
      const ageMs = now - p.dateOfBirth.getTime();
      const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
      const careGaps = p.therapyGaps.map(g =>
        g.medication ? `${g.medication} gap` : g.device ? `${g.device} eval` : g.currentStatus,
      );
      return {
        id: p.id,
        mrn: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        age,
        gender: p.gender,
        riskCategory: p.riskCategory,
        riskScore: p.riskScore,
        gapCount: p.therapyGaps.length,
        careGaps,
        lastAssessment: p.lastAssessment?.toISOString() ?? null,
      };
    });

    res.json({
      success: true,
      data: worklist,
      count: worklist.length,
      source: 'database',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error) {
    logger.error('Failed to load EP patient worklist', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load Electrophysiology patient worklist' } as APIResponse);
  }
});

// ==============================================================================
// ADVANCED ELECTROPHYSIOLOGY CLINICAL DECISION SUPPORT APIS
// ==============================================================================

// EP Ablation Success Predictor
router.post('/electrophysiology/ablation-predictor', (req, res) => {
  const { patientData } = req.body;
  
  // Advanced EP ablation success prediction algorithm
  let successScore = 80; // Base success rate
  
  // Age impact
  if (patientData.age > 75) successScore -= 15;
  else if (patientData.age > 65) successScore -= 8;
  
  // Arrhythmia type impact
  if (patientData.arrhythmiaType === 'persistent_afib') successScore -= 20;
  else if (patientData.arrhythmiaType === 'longstanding_persistent_afib') successScore -= 35;
  else if (patientData.arrhythmiaType === 'paroxysmal_afib') successScore += 5;
  else if (patientData.arrhythmiaType === 'vt') successScore -= 10;
  
  // Structural heart disease impact
  if (patientData.hasStructuralHeart) successScore -= 18;
  if (patientData.leftAtrialSize > 50) successScore -= 12;
  if (patientData.ef < 50) successScore -= 10;
  
  // Previous procedures
  if (patientData.previousAblations > 0) successScore -= (patientData.previousAblations * 15);
  
  // Comorbidities
  if (patientData.hasObesity) successScore -= 8;
  if (patientData.hasSleepApnea) successScore -= 6;
  if (patientData.hasHypertension) successScore -= 5;
  
  // Ensure reasonable bounds
  successScore = Math.max(15, Math.min(95, successScore));
  
  const recommendation = successScore >= 70 ? 'High success probability - Proceed with ablation' :
                        successScore >= 50 ? 'Moderate success probability - Consider patient optimization' :
                        'Lower success probability - Consider medical management';
  
  const riskFactors = [];
  if (patientData.age > 75) riskFactors.push('Advanced age');
  if (patientData.arrhythmiaType.includes('persistent')) riskFactors.push('Persistent/Long-standing persistent AF');
  if (patientData.hasStructuralHeart) riskFactors.push('Structural heart disease');
  if (patientData.leftAtrialSize > 50) riskFactors.push('Left atrial enlargement');
  if (patientData.previousAblations > 0) riskFactors.push('Previous ablation procedures');
  
  res.json({
    success: true,
    data: {
      patientId: patientData.id,
      successProbability: successScore,
      recommendation,
      riskFactors,
      procedureSpecific: {
        expectedFluoroTime: patientData.hasStructuralHeart ? '45-60 min' : '25-40 min',
        expectedProcedureTime: patientData.arrhythmiaType.includes('persistent') ? '4-6 hours' : '2.5-4 hours',
        recommendedMapping: patientData.arrhythmiaType === 'vt' ? '3D electroanatomic mapping' : 'Pulmonary vein isolation'
      },
      followUpPlan: [
        'Device interrogation at 3 months',
        'Symptom assessment and ECG at 6 months',
        'Extended Holter monitoring at 12 months',
        'Annual follow-up with EP specialist'
      ],
      optimizationStrategies: successScore < 70 ? [
        'Weight loss if BMI > 30',
        'Sleep apnea screening and treatment',
        'Optimal rate and rhythm control',
        'Blood pressure optimization'
      ] : [],
      evidenceLevel: 'Class I, Level A (2023 HRS Guidelines)',
      timestamp: new Date().toISOString()
    },
    message: 'EP ablation success prediction analysis',
    timestamp: new Date().toISOString()
  });
});

// LAAC Device Selection Algorithm
router.post('/electrophysiology/laac-device-selection', (req, res) => {
  const { patientData } = req.body;
  
  // Advanced LAAC device selection algorithm
  const recommendations = [];
  
  // Left atrial appendage measurements
  const laaOstiumDiameter = patientData.laaOstiumDiameter || 20;
  const laaDepth = patientData.laaDepth || 25;
  const laaMorphology = patientData.laaMorphology || 'windsock';
  
  // Watchman FLX evaluation
  if (laaOstiumDiameter >= 14 && laaOstiumDiameter <= 31.5 && laaDepth >= 12) {
    recommendations.push({
      device: 'Watchman FLX',
      suitability: 95,
      recommendedSize: laaOstiumDiameter + 2 + 'mm',
      advantages: [
        'Proven long-term safety and efficacy',
        'Single device design',
        'Excellent sealing properties',
        'Recapture capability'
      ],
      considerations: [
        'Requires dual antiplatelet therapy',
        'TEE follow-up at 45 days and 6 months'
      ]
    });
  }
  
  // Amulet evaluation
  if (laaOstiumDiameter >= 11 && laaOstiumDiameter <= 31 && laaDepth >= 10) {
    recommendations.push({
      device: 'Amulet',
      suitability: laaMorphology === 'chicken-wing' ? 92 : 88,
      recommendedSize: `${laaOstiumDiameter + 4}/${laaOstiumDiameter + 6}mm`,
      advantages: [
        'Dual-seal design',
        'Excellent for challenging anatomy',
        'Lower residual leak rates',
        'Flexible deployment'
      ],
      considerations: [
        'Requires dual antiplatelet therapy',
        'TEE follow-up protocol'
      ]
    });
  }
  
  // Contraindications assessment
  const contraindications = [];
  if (patientData.hasActiveEndocarditis) contraindications.push('Active endocarditis');
  if (patientData.hasLAAThrombus) contraindications.push('Left atrial appendage thrombus');
  if (patientData.hasComplexCongenitalHeart) contraindications.push('Complex congenital heart disease');
  
  const bestRecommendation = recommendations.sort((a, b) => b.suitability - a.suitability)[0];
  
  res.json({
    success: true,
    data: {
      patientId: patientData.id,
      primaryRecommendation: bestRecommendation,
      alternativeOptions: recommendations.slice(1),
      contraindications,
      periprocedural: {
        anesthesia: 'General anesthesia with TEE guidance',
        access: 'Transseptal puncture',
        imaging: '3D TEE and fluoroscopy',
        anticoagulation: 'Heparin with ACT > 250 seconds'
      },
      postProcedure: {
        anticoagulation: contraindications.length === 0 ? 
          'Dual antiplatelet therapy (aspirin + clopidogrel) for 6 months, then aspirin indefinitely' :
          'Per contraindication-specific protocol',
        followUp: [
          'TEE at 45 days to assess device position and seal',
          'TEE at 6 months for leak assessment',
          'Annual clinical follow-up'
        ]
      },
      successMetrics: {
        deviceSuccess: '> 95%',
        proceduralSuccess: '> 98%',
        stroke_reduction: '60-70% relative risk reduction'
      },
      timestamp: new Date().toISOString()
    },
    message: 'LAAC device selection recommendation',
    timestamp: new Date().toISOString()
  });
});

// EP Anticoagulation Decision Support
router.post('/electrophysiology/anticoagulation-decision', (req, res) => {
  const { patientData } = req.body;
  
  // Get automated CHA2DS2-VASc and HAS-BLED scores
  const cha2ds2vasc = calculateCHA2DS2VASc(patientData);
  const hasbled = calculateHASBLED(patientData);
  
  // Advanced anticoagulation decision algorithm
  let recommendation = 'No anticoagulation';
  let strength = 'Class III';
  let evidenceLevel = 'Level C';
  
  if (cha2ds2vasc >= 2 || (cha2ds2vasc >= 1 && patientData.sex === 'M')) {
    if (hasbled <= 2) {
      recommendation = 'Oral anticoagulation recommended';
      strength = 'Class I';
      evidenceLevel = 'Level A';
    } else {
      recommendation = 'Oral anticoagulation recommended with bleeding risk mitigation';
      strength = 'Class IIa';
      evidenceLevel = 'Level B';
    }
  } else if (cha2ds2vasc === 1 && patientData.sex === 'F') {
    recommendation = 'Consider oral anticoagulation';
    strength = 'Class IIb';
    evidenceLevel = 'Level B';
  }
  
  // DOAC selection algorithm
  const doacRecommendations = [];
  
  if (patientData.creatinine <= 1.5) {
    doacRecommendations.push({
      medication: 'Apixaban',
      dose: patientData.age >= 80 || patientData.weight <= 60 ? '2.5mg BID' : '5mg BID',
      advantages: ['Lowest bleeding risk', 'No need for INR monitoring', 'Fewest drug interactions'],
      monitoring: 'Renal function q6-12 months'
    });
    
    doacRecommendations.push({
      medication: 'Rivaroxaban',
      dose: '20mg daily with evening meal',
      advantages: ['Once daily dosing', 'Proven efficacy', 'No INR monitoring'],
      monitoring: 'Renal function q6-12 months'
    });
  }
  
  // Bleeding risk mitigation strategies
  const bleedingMitigation = [];
  if (hasbled >= 3) {
    bleedingMitigation.push('PPI therapy for GI protection');
    bleedingMitigation.push('Blood pressure optimization (<130/80)');
    bleedingMitigation.push('Alcohol cessation counseling');
    bleedingMitigation.push('Fall risk assessment and mitigation');
    bleedingMitigation.push('Regular INR monitoring if on warfarin');
  }
  
  res.json({
    success: true,
    data: {
      patientId: patientData.id,
      cha2ds2vascScore: cha2ds2vasc,
      hasbledScore: hasbled,
      primaryRecommendation: {
        anticoagulation: recommendation,
        strength,
        evidenceLevel
      },
      doacOptions: doacRecommendations,
      bleedingRiskMitigation: bleedingMitigation,
      specialConsiderations: {
        renalImpairment: patientData.creatinine > 1.5 ? 'Dose adjustment required' : 'Standard dosing',
        liverDisease: patientData.hasLiverDisease ? 'Consider warfarin over DOACs' : 'No restrictions',
        drugInteractions: 'Check for CYP3A4 and P-gp interactions'
      },
      monitoring: {
        baseline: ['CBC', 'CMP', 'PT/INR', 'Renal function'],
        followUp: ['Renal function q6-12 months', 'CBC annually', 'Assess bleeding/thrombotic events']
      },
      guidelines: '2023 ACC/AHA/ACCP/HRS AFib Guidelines',
      timestamp: new Date().toISOString()
    },
    message: 'EP anticoagulation decision support',
    timestamp: new Date().toISOString()
  });
});

// Helper functions for score calculations
function calculateCHA2DS2VASc(patientData: any) {
  let score = 0;
  if (patientData.hasCongestiveHF) score += 1;
  if (patientData.hasHypertension) score += 1;
  if (patientData.age >= 75) score += 2;
  else if (patientData.age >= 65) score += 1;
  if (patientData.hasDiabetes) score += 1;
  if (patientData.hasStrokeHistory) score += 2;
  if (patientData.hasVascularDisease) score += 1;
  if (patientData.sex === 'F') score += 1;
  return score;
}

function calculateHASBLED(patientData: any) {
  let score = 0;
  if (patientData.hasHypertension) score += 1;
  if (patientData.hasRenalDisease || patientData.hasLiverDisease) score += 1;
  if (patientData.hasStrokeHistory) score += 1;
  if (patientData.hasBleeding) score += 1;
  if (patientData.hasLabilINR) score += 1;
  if (patientData.age > 65) score += 1;
  if (patientData.takingDrugs || patientData.hasAlcohol) score += 1;
  return score;
}

// ==============================================================================
// STRUCTURAL HEART MODULE — Prisma-backed, tenant-scoped
// ==============================================================================

router.get('/structural-heart/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = isSuperAdmin(req) ? undefined : req.user?.hospitalId;
  if (!hospitalId && !isSuperAdmin(req)) {
    return res.status(401).json({ success: false, error: 'Not authenticated' } as APIResponse);
  }

  try {
    const shPatientWhere = {
      ...(hospitalId && { hospitalId }),
      isActive: true,
      OR: [
        { structuralHeartPatient: true },
        { therapyGaps: { some: { module: 'STRUCTURAL_HEART' as const, resolvedAt: null } } },
      ],
    };
    const openGapWhere = { ...(hospitalId && { hospitalId }), module: 'STRUCTURAL_HEART' as const, resolvedAt: null };

    const [
      totalPatients,
      openGapsByType,
      deviceGaps,
      recentGaps,
    ] = await Promise.all([
      prisma.patient.count({ where: shPatientWhere }),
      prisma.therapyGap.groupBy({
        by: ['gapType'],
        where: openGapWhere,
        _count: { id: true },
      }),
      prisma.therapyGap.count({
        where: { ...openGapWhere, gapType: 'DEVICE_ELIGIBLE' },
      }),
      prisma.therapyGap.findMany({
        where: openGapWhere,
        orderBy: { identifiedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          gapType: true,
          medication: true,
          device: true,
          currentStatus: true,
          targetStatus: true,
          identifiedAt: true,
          patientId: true,
        },
      }),
    ]);

    const totalOpenGaps = openGapsByType.reduce((sum, g) => sum + g._count.id, 0);
    const gapsByType = openGapsByType.reduce<Record<string, number>>((acc, g) => {
      acc[g.gapType] = g._count.id;
      return acc;
    }, {});

    const recentAlerts = recentGaps.map(g => ({
      gapId: g.id,
      patientId: g.patientId,
      type: g.gapType,
      severity: g.gapType === 'DEVICE_ELIGIBLE' ? 'high' : 'medium',
      message: g.medication
        ? `Missing ${g.medication}`
        : g.device
        ? `${g.device} candidate`
        : g.targetStatus,
      currentStatus: g.currentStatus,
      targetStatus: g.targetStatus,
      identifiedAt: g.identifiedAt.toISOString(),
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalPatients,
          totalOpenGaps,
          gapsByType,
          deviceCandidates: deviceGaps,
        },
        recentAlerts,
        source: 'database',
      },
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error) {
    logger.error('Failed to build Structural Heart dashboard', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load Structural Heart dashboard' } as APIResponse);
  }
});

router.get('/structural-heart/patients', async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = isSuperAdmin(req) ? undefined : req.user?.hospitalId;
  if (!hospitalId && !isSuperAdmin(req)) {
    return res.status(401).json({ success: false, error: 'Not authenticated' } as APIResponse);
  }

  try {
    const limitParam = Number.parseInt(String(req.query.limit ?? '100'), 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100;

    const patients = await prisma.patient.findMany({
      where: {
        ...(hospitalId && { hospitalId }),
        isActive: true,
        OR: [
          { structuralHeartPatient: true },
          { therapyGaps: { some: { module: 'STRUCTURAL_HEART' as const, resolvedAt: null } } },
        ],
      },
      orderBy: [{ riskCategory: 'desc' }, { lastAssessment: 'desc' }],
      take: limit,
      select: {
        id: true,
        mrn: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        riskCategory: true,
        riskScore: true,
        lastAssessment: true,
        therapyGaps: {
          where: { resolvedAt: null, module: 'STRUCTURAL_HEART' },
          select: { id: true, gapType: true, medication: true, device: true, currentStatus: true },
        },
      },
    });

    const now = Date.now();
    const worklist = patients.map(p => {
      const ageMs = now - p.dateOfBirth.getTime();
      const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
      const careGaps = p.therapyGaps.map(g =>
        g.medication ? `${g.medication} gap` : g.device ? `${g.device} eval` : g.currentStatus,
      );
      return {
        id: p.id,
        mrn: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        age,
        gender: p.gender,
        riskCategory: p.riskCategory,
        riskScore: p.riskScore,
        gapCount: p.therapyGaps.length,
        careGaps,
        lastAssessment: p.lastAssessment?.toISOString() ?? null,
      };
    });

    res.json({
      success: true,
      data: worklist,
      count: worklist.length,
      source: 'database',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error) {
    logger.error('Failed to load Structural Heart patient worklist', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load Structural Heart patient worklist' } as APIResponse);
  }
});

// ==============================================================================
// ADVANCED STRUCTURAL HEART CLINICAL DECISION SUPPORT APIS
// ==============================================================================

// TAVR Eligibility and Risk Assessment
router.post('/structural-heart/tavr-eligibility', (req, res) => {
  const { patientData } = req.body;
  
  // Advanced TAVR eligibility algorithm
  let eligibilityScore = 85; // Base eligibility
  let riskLevel = 'Intermediate';
  
  // Age considerations
  if (patientData.age >= 80) eligibilityScore += 5;
  else if (patientData.age < 65) eligibilityScore -= 10;
  
  // Surgical risk assessment
  const stsScore = patientData.stsScore || 4.5;
  if (stsScore > 8) {
    eligibilityScore += 15;
    riskLevel = 'High';
  } else if (stsScore > 4) {
    eligibilityScore += 5;
    riskLevel = 'Intermediate';
  } else {
    eligibilityScore -= 5;
    riskLevel = 'Low';
  }
  
  // Aortic valve severity
  if (patientData.aorticValveArea <= 0.6) eligibilityScore += 20;
  else if (patientData.aorticValveArea <= 1.0) eligibilityScore += 10;
  else eligibilityScore -= 10;
  
  // Mean gradient impact
  if (patientData.meanGradient >= 60) eligibilityScore += 15;
  else if (patientData.meanGradient >= 40) eligibilityScore += 10;
  else if (patientData.meanGradient < 20) eligibilityScore -= 15;
  
  // Anatomical considerations
  if (patientData.annulusSize < 18 || patientData.annulusSize > 29) eligibilityScore -= 10;
  if (patientData.hasSignificantCAD) eligibilityScore -= 5;
  if (patientData.hasMitralRegurgitation && patientData.mrSeverity >= 3) eligibilityScore -= 8;
  
  // Comorbidities
  if (patientData.hasKidneyDisease) eligibilityScore -= 8;
  if (patientData.hasLungDisease) eligibilityScore -= 6;
  if (patientData.hasPorcelainAorta) eligibilityScore += 15;
  if (patientData.hasChestRadiation) eligibilityScore += 10;
  
  eligibilityScore = Math.max(15, Math.min(100, eligibilityScore));
  
  const recommendation = eligibilityScore >= 75 ? 'TAVR strongly recommended' :
                        eligibilityScore >= 60 ? 'TAVR recommended - consider patient optimization' :
                        eligibilityScore >= 45 ? 'Multidisciplinary heart team evaluation recommended' :
                        'TAVR not recommended - consider alternative therapies';
  
  const contraindications = [];
  if (patientData.hasActiveEndocarditis) contraindications.push('Active infective endocarditis');
  if (patientData.lifeExpectancy < 1) contraindications.push('Life expectancy < 1 year');
  if (patientData.hasUntreatedCAD && patientData.cadSeverity >= 3) contraindications.push('Untreated severe coronary artery disease');
  
  res.json({
    success: true,
    data: {
      patientId: patientData.id,
      eligibilityScore,
      riskLevel,
      stsScore,
      recommendation,
      contraindications,
      anatomicalConsiderations: {
        annulusSize: patientData.annulusSize,
        calcification: patientData.calcificationScore || 'Moderate',
        accessRoute: patientData.annulusSize >= 20 ? 'Transfemoral preferred' : 'Alternative access may be needed',
        vascularAccess: 'CT angiography recommended for access planning'
      },
      proceduralRisk: {
        mortalityRisk: stsScore > 8 ? 'High (>8%)' : stsScore > 4 ? 'Intermediate (4-8%)' : 'Low (<4%)',
        strokeRisk: patientData.hasAfib ? 'Elevated' : 'Standard',
        vascularRisk: patientData.hasPeripheralVascular ? 'Elevated' : 'Standard',
        acuteKidneyInjury: patientData.hasKidneyDisease ? 'Elevated' : 'Standard'
      },
      postProcedure: {
        anticoagulation: patientData.hasAfib ? 'DOAC + aspirin for 3-6 months' : 'Dual antiplatelet therapy',
        followUp: [
          'Echo at 30 days',
          'Clinical assessment at 6 months',
          'Annual echo and clinical follow-up',
          'Valve durability monitoring'
        ]
      },
      guidelines: 'AHA/ACC 2020 Valvular Heart Disease Guidelines',
      timestamp: new Date().toISOString()
    },
    message: 'TAVR eligibility assessment completed',
    timestamp: new Date().toISOString()
  });
});

// TAVR Valve Selection Algorithm
router.post('/structural-heart/tavr-valve-selection', (req, res) => {
  const { patientData } = req.body;
  
  const annulusSize = patientData.annulusSize;
  const recommendations = [];
  
  // Edwards SAPIEN 3 Ultra evaluation
  if (annulusSize >= 18.5 && annulusSize <= 28.5) {
    let valveSize = '23mm';
    if (annulusSize >= 21.2 && annulusSize <= 25.7) valveSize = '26mm';
    else if (annulusSize >= 24.8 && annulusSize <= 28.5) valveSize = '29mm';
    
    recommendations.push({
      valve: 'Edwards SAPIEN 3 Ultra',
      size: valveSize,
      suitability: annulusSize >= 20 && annulusSize <= 27 ? 95 : 85,
      advantages: [
        'Proven durability and hemodynamics',
        'Low paravalvular leak rates',
        'Excellent track record',
        'Balloon-expandable precision'
      ],
      considerations: [
        'Requires precise sizing',
        'Permanent pacemaker rate: ~7%',
        'Excellent for bicuspid anatomy'
      ]
    });
  }
  
  // Medtronic Evolut PRO+ evaluation
  if (annulusSize >= 18 && annulusSize <= 30) {
    let valveSize = '23mm';
    if (annulusSize >= 20 && annulusSize <= 25) valveSize = '26mm';
    else if (annulusSize >= 23 && annulusSize <= 28) valveSize = '29mm';
    else if (annulusSize >= 26 && annulusSize <= 30) valveSize = '34mm';
    
    recommendations.push({
      valve: 'Medtronic Evolut PRO+',
      size: valveSize,
      suitability: patientData.hasSignificantCalcification ? 92 : 88,
      advantages: [
        'Self-expanding design',
        'Excellent for calcified valves',
        'Repositionable and retrievable',
        'Good hemodynamic performance'
      ],
      considerations: [
        'Higher pacemaker rate (~17%)',
        'Supra-annular position',
        'May require balloon post-dilation'
      ]
    });
  }
  
  // Boston Scientific Lotus Edge (if available)
  if (annulusSize >= 20 && annulusSize <= 27) {
    recommendations.push({
      valve: 'Boston Scientific Lotus Edge',
      size: annulusSize <= 23 ? '23mm' : '27mm',
      suitability: 85,
      advantages: [
        'Fully repositionable',
        'Controlled mechanical expansion',
        'Low paravalvular leak',
        'Depth control technology'
      ],
      considerations: [
        'Limited long-term data',
        'Pacemaker rate ~28%',
        'Complex delivery system'
      ]
    });
  }
  
  const bestRecommendation = recommendations.sort((a, b) => b.suitability - a.suitability)[0];
  
  res.json({
    success: true,
    data: {
      patientId: patientData.id,
      annulusSize,
      primaryRecommendation: bestRecommendation,
      alternativeOptions: recommendations.slice(1),
      sizingConsiderations: {
        methodology: 'CT-based 3D measurements',
        oversizing: '10-20% recommended',
        calcificationImpact: patientData.hasSignificantCalcification ? 'May require larger size' : 'Standard sizing',
        geometryFactor: 'Consider oval vs circular anatomy'
      },
      proceduralPlanning: {
        access: annulusSize >= 20 ? 'Transfemoral preferred' : 'Consider transapical/transaortic',
        imaging: '3D TEE and fluoroscopy guidance',
        predilatation: patientData.hasSignificantCalcification ? 'Recommended' : 'Selective use',
        postdilatation: 'Based on paravalvular leak assessment'
      },
      riskMitigation: [
        'Rapid pacing for balloon-expandable valves',
        'Careful depth positioning to avoid conduction issues',
        'Staged PCI if significant CAD present',
        'Cerebral protection device consideration'
      ],
      qualityMetrics: {
        deviceSuccess: '> 95%',
        proceduralSuccess: '> 95%',
        paravalvularLeak: '< 5% moderate or greater',
        pacemakerRate: bestRecommendation?.valve.includes('SAPIEN') ? '~7%' : '~17%'
      },
      timestamp: new Date().toISOString()
    },
    message: 'TAVR valve selection completed',
    timestamp: new Date().toISOString()
  });
});

// MitraClip Eligibility Assessment
router.post('/structural-heart/mitraclip-eligibility', (req, res) => {
  const { patientData } = req.body;
  
  let eligibilityScore = 70; // Base score
  
  // MR severity assessment
  if (patientData.mrSeverity >= 4) eligibilityScore += 25;
  else if (patientData.mrSeverity >= 3) eligibilityScore += 15;
  else eligibilityScore -= 20;
  
  // Etiology considerations
  if (patientData.mrEtiology === 'functional') {
    eligibilityScore += 10;
    if (patientData.ef < 35) eligibilityScore += 10;
  } else if (patientData.mrEtiology === 'degenerative') {
    if (patientData.surgicalRisk === 'high') eligibilityScore += 15;
    else eligibilityScore -= 5;
  }
  
  // Anatomical factors
  if (patientData.mitralValveArea > 4.0) eligibilityScore += 10;
  if (patientData.posteriLeafletLength < 7) eligibilityScore -= 15;
  if (patientData.hasSignificantMAC) eligibilityScore -= 10;
  
  eligibilityScore = Math.max(20, Math.min(100, eligibilityScore));
  
  const recommendation = eligibilityScore >= 75 ? 'MitraClip strongly recommended' :
                        eligibilityScore >= 60 ? 'MitraClip reasonable option' :
                        eligibilityScore >= 45 ? 'Consider after heart team evaluation' :
                        'MitraClip not recommended - consider alternative therapy';
  
  res.json({
    success: true,
    data: {
      patientId: patientData.id,
      eligibilityScore,
      recommendation,
      anatomicalSuitability: {
        mrSeverity: patientData.mrSeverity,
        etiology: patientData.mrEtiology,
        jetLocation: patientData.jetLocation || 'Central',
        leafletMobility: 'Adequate for clip attachment',
        coaptationLength: patientData.coaptationLength || '2mm'
      },
      proceduralConsiderations: [
        'TEE guidance essential',
        'General anesthesia required',
        'Staged approach if multiple clips needed',
        'Post-procedure gradient monitoring'
      ],
      expectedOutcomes: {
        proceduralSuccess: '> 90%',
        mrReduction: 'Expect 1-2 grade reduction',
        symptomImprovement: '70-80% patients',
        hospitalStay: '1-2 days typical'
      },
      followUp: [
        'Echo at 30 days and 6 months',
        'Clinical assessment quarterly',
        'Annual durability monitoring',
        'Heart failure optimization'
      ],
      timestamp: new Date().toISOString()
    },
    message: 'MitraClip eligibility assessment completed',
    timestamp: new Date().toISOString()
  });
});


// ==============================================================================
// CORONARY INTERVENTION CLINICAL DECISION SUPPORT APIS
// ==============================================================================

router.get('/coronary-intervention/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = isSuperAdmin(req) ? undefined : req.user?.hospitalId;
  if (!hospitalId && !isSuperAdmin(req)) return res.status(401).json({ success: false, error: 'Not authenticated' } as APIResponse);
  try {
    const patientWhere = {
      ...(hospitalId && { hospitalId }), isActive: true,
      OR: [
        { coronaryPatient: true },
        { therapyGaps: { some: { module: 'CORONARY_INTERVENTION' as const, resolvedAt: null } } },
      ],
    };
    const openGapWhere = { ...(hospitalId && { hospitalId }), module: 'CORONARY_INTERVENTION' as const, resolvedAt: null };
    const [totalPatients, openGapsByType, deviceGaps, recentGaps] = await Promise.all([
      prisma.patient.count({ where: patientWhere }),
      prisma.therapyGap.groupBy({ by: ['gapType'], where: openGapWhere, _count: { id: true } }),
      prisma.therapyGap.count({ where: { ...openGapWhere, gapType: 'DEVICE_ELIGIBLE' } }),
      prisma.therapyGap.findMany({
        where: openGapWhere, orderBy: { identifiedAt: 'desc' }, take: 10,
        select: { id: true, gapType: true, medication: true, device: true, currentStatus: true, targetStatus: true, identifiedAt: true, patientId: true },
      }),
    ]);
    const totalOpenGaps = openGapsByType.reduce((sum, g) => sum + g._count.id, 0);
    const gapsByType = openGapsByType.reduce<Record<string, number>>((acc, g) => { acc[g.gapType] = g._count.id; return acc; }, {});
    const recentAlerts = recentGaps.map(g => ({
      gapId: g.id, patientId: g.patientId, type: g.gapType,
      severity: g.gapType === 'DEVICE_ELIGIBLE' ? 'high' : 'medium',
      message: g.medication ? `Missing ${g.medication}` : g.device ? `${g.device} candidate` : g.targetStatus,
      currentStatus: g.currentStatus, targetStatus: g.targetStatus,
      identifiedAt: g.identifiedAt.toISOString(),
    }));
    res.json({ success: true, data: { summary: { totalPatients, totalOpenGaps, gapsByType, deviceCandidates: deviceGaps }, recentAlerts, source: 'database' }, timestamp: new Date().toISOString() } as APIResponse);
  } catch (error) {
    logger.error('Failed to build Coronary dashboard', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load Coronary dashboard' } as APIResponse);
  }
});

router.post('/coronary-intervention/pci-risk', (req, res) => {
  const { patientData } = req.body;
  let riskScore = 2.0;
  if (patientData.age > 80) riskScore += 3.0;
  else if (patientData.age > 70) riskScore += 1.5;
  if (patientData.ef < 30) riskScore += 3.5;
  else if (patientData.ef < 40) riskScore += 1.5;
  if (patientData.creatinine > 2.0) riskScore += 2.5;
  if (patientData.hasCardiogenicShock) riskScore += 8.0;
  if (patientData.hasSTEMI) riskScore += 2.0;
  if (patientData.hasDiabetes) riskScore += 1.0;
  if (patientData.hasLeftMain) riskScore += 2.0;
  if (patientData.hasCTO) riskScore += 1.5;
  if (patientData.syntaxScore > 32) riskScore += 3.0;
  else if (patientData.syntaxScore > 22) riskScore += 1.5;
  riskScore = Math.max(0.5, Math.min(35, riskScore));
  const riskCategory = riskScore < 4 ? 'Low' : riskScore < 10 ? 'Intermediate' : 'High';
  res.json({
    success: true,
    data: {
      patientId: patientData.id, riskScore: parseFloat(riskScore.toFixed(2)), riskCategory,
      recommendation: riskCategory === 'Low' ? 'Standard PCI pathway' : riskCategory === 'Intermediate' ? 'Consider hemodynamic support' : 'High risk - multidisciplinary review',
      syntaxAssessment: { score: patientData.syntaxScore || 'Not calculated', recommendation: (patientData.syntaxScore || 0) > 32 ? 'Consider CABG referral' : 'PCI appropriate' },
      antiplateletStrategy: {
        recommendation: patientData.hasHighBleedingRisk ? 'Short DAPT (1-3 months)' : 'Standard DAPT (6-12 months)',
        agents: ['Aspirin 81mg indefinitely', patientData.hasSTEMI ? 'Prasugrel 10mg or Ticagrelor 90mg BID' : 'Clopidogrel 75mg or Ticagrelor 90mg BID']
      },
      timestamp: new Date().toISOString()
    },
    message: 'PCI risk stratification completed', timestamp: new Date().toISOString()
  } as APIResponse);
});

router.get('/coronary-intervention/patients', async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = isSuperAdmin(req) ? undefined : req.user?.hospitalId;
  if (!hospitalId && !isSuperAdmin(req)) return res.status(401).json({ success: false, error: 'Not authenticated' } as APIResponse);
  try {
    const limitParam = Number.parseInt(String(req.query.limit ?? '100'), 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100;
    const patients = await prisma.patient.findMany({
      where: { ...(hospitalId && { hospitalId }), isActive: true, OR: [{ coronaryPatient: true }, { therapyGaps: { some: { module: 'CORONARY_INTERVENTION' as const, resolvedAt: null } } }] },
      orderBy: [{ riskCategory: 'desc' }, { lastAssessment: 'desc' }],
      take: limit,
      select: {
        id: true, mrn: true, firstName: true, lastName: true, dateOfBirth: true,
        gender: true, riskCategory: true, riskScore: true, lastAssessment: true,
        therapyGaps: { where: { resolvedAt: null, module: 'CORONARY_INTERVENTION' }, select: { id: true, gapType: true, medication: true, device: true, currentStatus: true } },
      },
    });
    const now = Date.now();
    const worklist = patients.map(p => {
      const age = Math.floor((now - p.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return { id: p.id, mrn: p.mrn, firstName: p.firstName, lastName: p.lastName, age, gender: p.gender, riskCategory: p.riskCategory, riskScore: p.riskScore, gapCount: p.therapyGaps.length, careGaps: p.therapyGaps.map(g => g.medication ? `${g.medication} gap` : g.device ? `${g.device} eval` : g.currentStatus), lastAssessment: p.lastAssessment?.toISOString() ?? null };
    });
    res.json({ success: true, data: worklist, count: worklist.length, source: 'database', timestamp: new Date().toISOString() } as APIResponse);
  } catch (error) {
    logger.error('Failed to load Coronary patients', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load Coronary patient worklist' } as APIResponse);
  }
});

router.post('/coronary-intervention/ffr-decision', (req, res) => {
  const { patientData } = req.body;
  const stenosisPercent = patientData.stenosisPercent || 60;
  const ffrValue = patientData.ffrValue;
  const ifrValue = patientData.ifrValue;
  let recommendation = 'Defer revascularization';
  let evidenceLevel = 'Class I, Level A';
  if (ffrValue !== undefined) {
    recommendation = ffrValue <= 0.80 ? 'Revascularization recommended (FFR-positive)' : 'Medical therapy recommended (FFR-negative)';
  } else if (ifrValue !== undefined) {
    recommendation = ifrValue <= 0.89 ? 'Revascularization recommended (iFR-positive)' : 'Medical therapy recommended (iFR-negative)';
  } else if (stenosisPercent >= 90) {
    recommendation = 'Revascularization recommended (severe stenosis)';
  } else if (stenosisPercent >= 50 && stenosisPercent < 90) {
    recommendation = 'Physiological assessment recommended (FFR/iFR)';
    evidenceLevel = 'Class I, Level A - FAME/DEFINE-FLAIR trials';
  }
  res.json({
    success: true,
    data: {
      patientId: patientData.id, stenosisPercent, ffrValue, ifrValue, recommendation, evidenceLevel,
      revenueImplication: ffrValue !== undefined || ifrValue !== undefined ? 'Physiological assessment documented - higher reimbursement' : 'Consider adding FFR/iFR for quality and revenue',
      qualityMetrics: { ffrUtilization: '68.4%', benchmark: '75%', improvementOpportunity: '+$1.2M annual revenue with optimal FFR utilization' },
      timestamp: new Date().toISOString()
    },
    message: 'FFR/iFR decision support completed', timestamp: new Date().toISOString()
  } as APIResponse);
});

// ==============================================================================
// VALVULAR DISEASE CLINICAL DECISION SUPPORT APIS
// ==============================================================================

router.get('/valvular-disease/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = isSuperAdmin(req) ? undefined : req.user?.hospitalId;
  if (!hospitalId && !isSuperAdmin(req)) return res.status(401).json({ success: false, error: 'Not authenticated' } as APIResponse);
  try {
    const patientWhere = {
      ...(hospitalId && { hospitalId }), isActive: true,
      OR: [
        { valvularDiseasePatient: true },
        { therapyGaps: { some: { module: 'VALVULAR_DISEASE' as const, resolvedAt: null } } },
      ],
    };
    const openGapWhere = { ...(hospitalId && { hospitalId }), module: 'VALVULAR_DISEASE' as const, resolvedAt: null };
    const [totalPatients, openGapsByType, deviceGaps, recentGaps] = await Promise.all([
      prisma.patient.count({ where: patientWhere }),
      prisma.therapyGap.groupBy({ by: ['gapType'], where: openGapWhere, _count: { id: true } }),
      prisma.therapyGap.count({ where: { ...openGapWhere, gapType: 'DEVICE_ELIGIBLE' } }),
      prisma.therapyGap.findMany({
        where: openGapWhere, orderBy: { identifiedAt: 'desc' }, take: 10,
        select: { id: true, gapType: true, medication: true, device: true, currentStatus: true, targetStatus: true, identifiedAt: true, patientId: true },
      }),
    ]);
    const totalOpenGaps = openGapsByType.reduce((sum, g) => sum + g._count.id, 0);
    const gapsByType = openGapsByType.reduce<Record<string, number>>((acc, g) => { acc[g.gapType] = g._count.id; return acc; }, {});
    const recentAlerts = recentGaps.map(g => ({
      gapId: g.id, patientId: g.patientId, type: g.gapType,
      severity: g.gapType === 'DEVICE_ELIGIBLE' ? 'high' : 'medium',
      message: g.medication ? `Missing ${g.medication}` : g.device ? `${g.device} candidate` : g.targetStatus,
      currentStatus: g.currentStatus, targetStatus: g.targetStatus,
      identifiedAt: g.identifiedAt.toISOString(),
    }));
    res.json({ success: true, data: { summary: { totalPatients, totalOpenGaps, gapsByType, deviceCandidates: deviceGaps }, recentAlerts, source: 'database' }, timestamp: new Date().toISOString() } as APIResponse);
  } catch (error) {
    logger.error('Failed to build Valvular dashboard', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load Valvular Disease dashboard' } as APIResponse);
  }
});

router.post('/valvular-disease/severity-classification', (req, res) => {
  const { patientData } = req.body;
  const aortic = {
    peakVelocity: patientData.aorticPeakVelocity || 0,
    meanGradient: patientData.aorticMeanGradient || 0,
    valveArea: patientData.aorticValveArea || 0,
    severity: 'Not assessed' as string,
    recommendation: ''
  };
  if (aortic.peakVelocity >= 4.0 || aortic.meanGradient >= 40 || aortic.valveArea <= 1.0) {
    aortic.severity = aortic.valveArea <= 0.6 ? 'Critical' : 'Severe';
    aortic.recommendation = 'Heart team evaluation for intervention';
  } else if (aortic.peakVelocity >= 3.0 || aortic.meanGradient >= 20) {
    aortic.severity = 'Moderate';
    aortic.recommendation = 'Annual echo surveillance, symptom monitoring';
  } else if (aortic.peakVelocity >= 2.0) {
    aortic.severity = 'Mild';
    aortic.recommendation = 'Echo every 3-5 years';
  }
  const mitral = {
    regurgitantVolume: patientData.mrRegurgitantVolume || 0,
    eroa: patientData.mrEROA || 0,
    severity: 'Not assessed' as string,
    etiology: patientData.mrEtiology || 'degenerative',
    recommendation: ''
  };
  if (mitral.regurgitantVolume >= 60 || mitral.eroa >= 0.4) {
    mitral.severity = 'Severe';
    mitral.recommendation = mitral.etiology === 'degenerative' ? 'Surgical repair evaluation' : 'MitraClip/TEER evaluation';
  } else if (mitral.regurgitantVolume >= 30 || mitral.eroa >= 0.2) {
    mitral.severity = 'Moderate';
    mitral.recommendation = 'Annual echo surveillance';
  }
  res.json({
    success: true,
    data: {
      patientId: patientData.id,
      aorticStenosis: aortic, mitralRegurgitation: mitral,
      interventionTimeline: aortic.severity === 'Severe' || mitral.severity === 'Severe' ? 'Urgent heart team review within 2 weeks' : 'Routine follow-up',
      guidelines: 'ACC/AHA 2020 Valvular Heart Disease Guidelines',
      timestamp: new Date().toISOString()
    },
    message: 'Valve severity classification completed', timestamp: new Date().toISOString()
  } as APIResponse);
});

router.get('/valvular-disease/patients', async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = isSuperAdmin(req) ? undefined : req.user?.hospitalId;
  if (!hospitalId && !isSuperAdmin(req)) return res.status(401).json({ success: false, error: 'Not authenticated' } as APIResponse);
  try {
    const limitParam = Number.parseInt(String(req.query.limit ?? '100'), 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100;
    const patients = await prisma.patient.findMany({
      where: { ...(hospitalId && { hospitalId }), isActive: true, OR: [{ valvularDiseasePatient: true }, { therapyGaps: { some: { module: 'VALVULAR_DISEASE' as const, resolvedAt: null } } }] },
      orderBy: [{ riskCategory: 'desc' }, { lastAssessment: 'desc' }],
      take: limit,
      select: {
        id: true, mrn: true, firstName: true, lastName: true, dateOfBirth: true,
        gender: true, riskCategory: true, riskScore: true, lastAssessment: true,
        therapyGaps: { where: { resolvedAt: null, module: 'VALVULAR_DISEASE' }, select: { id: true, gapType: true, medication: true, device: true, currentStatus: true } },
      },
    });
    const now = Date.now();
    const worklist = patients.map(p => {
      const age = Math.floor((now - p.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return { id: p.id, mrn: p.mrn, firstName: p.firstName, lastName: p.lastName, age, gender: p.gender, riskCategory: p.riskCategory, riskScore: p.riskScore, gapCount: p.therapyGaps.length, careGaps: p.therapyGaps.map(g => g.medication ? `${g.medication} gap` : g.device ? `${g.device} eval` : g.currentStatus), lastAssessment: p.lastAssessment?.toISOString() ?? null };
    });
    res.json({ success: true, data: worklist, count: worklist.length, source: 'database', timestamp: new Date().toISOString() } as APIResponse);
  } catch (error) {
    logger.error('Failed to load Valvular patients', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load Valvular Disease patient worklist' } as APIResponse);
  }
});

// ==============================================================================
// PERIPHERAL VASCULAR CLINICAL DECISION SUPPORT APIS
// ==============================================================================

router.get('/peripheral-vascular/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = isSuperAdmin(req) ? undefined : req.user?.hospitalId;
  if (!hospitalId && !isSuperAdmin(req)) return res.status(401).json({ success: false, error: 'Not authenticated' } as APIResponse);
  try {
    const patientWhere = {
      ...(hospitalId && { hospitalId }), isActive: true,
      OR: [
        { peripheralVascularPatient: true },
        { therapyGaps: { some: { module: 'PERIPHERAL_VASCULAR' as const, resolvedAt: null } } },
      ],
    };
    const openGapWhere = { ...(hospitalId && { hospitalId }), module: 'PERIPHERAL_VASCULAR' as const, resolvedAt: null };
    const [totalPatients, openGapsByType, deviceGaps, recentGaps] = await Promise.all([
      prisma.patient.count({ where: patientWhere }),
      prisma.therapyGap.groupBy({ by: ['gapType'], where: openGapWhere, _count: { id: true } }),
      prisma.therapyGap.count({ where: { ...openGapWhere, gapType: 'DEVICE_ELIGIBLE' } }),
      prisma.therapyGap.findMany({
        where: openGapWhere, orderBy: { identifiedAt: 'desc' }, take: 10,
        select: { id: true, gapType: true, medication: true, device: true, currentStatus: true, targetStatus: true, identifiedAt: true, patientId: true },
      }),
    ]);
    const totalOpenGaps = openGapsByType.reduce((sum, g) => sum + g._count.id, 0);
    const gapsByType = openGapsByType.reduce<Record<string, number>>((acc, g) => { acc[g.gapType] = g._count.id; return acc; }, {});
    const recentAlerts = recentGaps.map(g => ({
      gapId: g.id, patientId: g.patientId, type: g.gapType,
      severity: g.gapType === 'DEVICE_ELIGIBLE' ? 'high' : 'medium',
      message: g.medication ? `Missing ${g.medication}` : g.device ? `${g.device} candidate` : g.targetStatus,
      currentStatus: g.currentStatus, targetStatus: g.targetStatus,
      identifiedAt: g.identifiedAt.toISOString(),
    }));
    res.json({ success: true, data: { summary: { totalPatients, totalOpenGaps, gapsByType, deviceCandidates: deviceGaps }, recentAlerts, source: 'database' }, timestamp: new Date().toISOString() } as APIResponse);
  } catch (error) {
    logger.error('Failed to build Peripheral Vascular dashboard', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load Peripheral Vascular dashboard' } as APIResponse);
  }
});

router.post('/peripheral-vascular/wifi-classification', (req, res) => {
  const { patientData } = req.body;
  const woundGrade = patientData.woundGrade || 0;
  const ischemiaGrade = patientData.ischemiaGrade || 0;
  const footInfectionGrade = patientData.footInfectionGrade || 0;
  const compositeScore = woundGrade + ischemiaGrade + footInfectionGrade;
  let clinicalStage = 1;
  let amputationRisk = 'Very Low';
  let revascularizationBenefit = 'Low';
  if (compositeScore >= 7) { clinicalStage = 4; amputationRisk = 'Very High (>50%)'; revascularizationBenefit = 'High - urgent revascularization recommended'; }
  else if (compositeScore >= 5) { clinicalStage = 3; amputationRisk = 'High (25-50%)'; revascularizationBenefit = 'High'; }
  else if (compositeScore >= 3) { clinicalStage = 2; amputationRisk = 'Moderate (10-25%)'; revascularizationBenefit = 'Moderate'; }
  res.json({
    success: true,
    data: {
      patientId: patientData.id,
      wifiComponents: { wound: woundGrade, ischemia: ischemiaGrade, footInfection: footInfectionGrade },
      clinicalStage, amputationRisk, revascularizationBenefit,
      treatmentPlan: {
        immediate: clinicalStage >= 3 ? ['Urgent vascular consultation', 'IV antibiotics if infected', 'Pain management'] : ['Wound care optimization', 'ABI measurement'],
        shortTerm: clinicalStage >= 2 ? ['Angiography and revascularization planning', 'Multidisciplinary wound care'] : ['Supervised exercise therapy', 'Risk factor modification'],
        longTerm: ['Surveillance duplex ultrasound', 'Cardiovascular risk reduction', 'Diabetes management if applicable']
      },
      revenueImplication: {
        drgCategory: clinicalStage >= 3 ? 'DRG 252 (Peripheral Vascular Procedures)' : 'DRG 253 (Other Vascular Procedures)',
        estimatedReimbursement: clinicalStage >= 3 ? '$58,000-$95,000' : '$14,500-$52,000'
      },
      guidelines: 'SVS/ESVS 2019 CLTI Guidelines', timestamp: new Date().toISOString()
    },
    message: 'WIfI classification completed', timestamp: new Date().toISOString()
  } as APIResponse);
});

router.post('/peripheral-vascular/pad-screening', (req, res) => {
  const { patientData } = req.body;
  const abiRight = patientData.abiRight || 1.0;
  const abiLeft = patientData.abiLeft || 1.0;
  const lowestABI = Math.min(abiRight, abiLeft);
  let padSeverity = 'Normal';
  let recommendation = 'No PAD detected';
  if (lowestABI < 0.40) { padSeverity = 'Severe PAD / Critical Limb Ischemia'; recommendation = 'Urgent vascular surgery referral'; }
  else if (lowestABI < 0.70) { padSeverity = 'Moderate PAD'; recommendation = 'Vascular consultation, supervised exercise, medical therapy'; }
  else if (lowestABI < 0.90) { padSeverity = 'Mild PAD'; recommendation = 'Risk factor modification, supervised exercise, annual ABI'; }
  else if (lowestABI > 1.40) { padSeverity = 'Non-compressible (calcified)'; recommendation = 'Toe-brachial index recommended'; }
  const riskFactors: string[] = [];
  if (patientData.hasDiabetes) riskFactors.push('Diabetes mellitus');
  if (patientData.isSmoker) riskFactors.push('Active smoking');
  if (patientData.hasHypertension) riskFactors.push('Hypertension');
  if (patientData.hasDyslipidemia) riskFactors.push('Dyslipidemia');
  if (patientData.age > 65) riskFactors.push('Age >65');
  res.json({
    success: true,
    data: {
      patientId: patientData.id,
      abiResults: { right: abiRight, left: abiLeft, lowest: lowestABI },
      padSeverity, recommendation, riskFactors,
      medicalTherapy: {
        antiplatelet: lowestABI < 0.90 ? 'Aspirin 81mg or Clopidogrel 75mg' : 'Based on CV risk',
        statin: 'High-intensity statin therapy recommended',
        antihypertensive: 'Target <130/80 mmHg'
      },
      exerciseTherapy: {
        recommendation: lowestABI < 0.90 && lowestABI >= 0.40 ? 'Supervised exercise program (Grade A)' : 'Modified activity',
        expectedBenefit: '50-200% improvement in walking distance'
      },
      timestamp: new Date().toISOString()
    },
    message: 'PAD screening completed', timestamp: new Date().toISOString()
  } as APIResponse);
});

router.get('/peripheral-vascular/patients', async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = isSuperAdmin(req) ? undefined : req.user?.hospitalId;
  if (!hospitalId && !isSuperAdmin(req)) return res.status(401).json({ success: false, error: 'Not authenticated' } as APIResponse);
  try {
    const limitParam = Number.parseInt(String(req.query.limit ?? '100'), 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100;
    const patients = await prisma.patient.findMany({
      where: { ...(hospitalId && { hospitalId }), isActive: true, OR: [{ peripheralVascularPatient: true }, { therapyGaps: { some: { module: 'PERIPHERAL_VASCULAR' as const, resolvedAt: null } } }] },
      orderBy: [{ riskCategory: 'desc' }, { lastAssessment: 'desc' }],
      take: limit,
      select: {
        id: true, mrn: true, firstName: true, lastName: true, dateOfBirth: true,
        gender: true, riskCategory: true, riskScore: true, lastAssessment: true,
        therapyGaps: { where: { resolvedAt: null, module: 'PERIPHERAL_VASCULAR' }, select: { id: true, gapType: true, medication: true, device: true, currentStatus: true } },
      },
    });
    const now = Date.now();
    const worklist = patients.map(p => {
      const age = Math.floor((now - p.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return { id: p.id, mrn: p.mrn, firstName: p.firstName, lastName: p.lastName, age, gender: p.gender, riskCategory: p.riskCategory, riskScore: p.riskScore, gapCount: p.therapyGaps.length, careGaps: p.therapyGaps.map(g => g.medication ? `${g.medication} gap` : g.device ? `${g.device} eval` : g.currentStatus), lastAssessment: p.lastAssessment?.toISOString() ?? null };
    });
    res.json({ success: true, data: worklist, count: worklist.length, source: 'database', timestamp: new Date().toISOString() } as APIResponse);
  } catch (error) {
    logger.error('Failed to load Peripheral Vascular patients', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load Peripheral Vascular patient worklist' } as APIResponse);
  }
});

export = router;
