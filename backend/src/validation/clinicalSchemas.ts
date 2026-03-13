import { z } from 'zod';

// ── Validation helper ─────────────────────────────────────────────────────────

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RISK SCORE ASSESSMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const createRiskScoreSchema = z
  .object({
    patientId: z.string().min(1),
    hospitalId: z.string().min(1),
    module: z.string().min(1),
    scoreType: z.string().min(1),
    totalScore: z.number(),
    riskCategory: z.string().min(1),
    components: z.any().optional(),
    inputData: z.any(),                    // Raw input values used for calculation
    interpretation: z.string().min(1),     // Clinical interpretation text
    recommendation: z.string().optional(),
    mortality: z.number().optional(),
    eventRisk: z.number().optional(),
    calculatedBy: z.string().optional(),
    clinicalContext: z.string().optional(),
  })
  .strict();

// ═══════════════════════════════════════════════════════════════════════════════
// INTERVENTION TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export const createInterventionSchema = z
  .object({
    patientId: z.string().min(1),
    hospitalId: z.string().min(1),
    module: z.string().min(1),
    interventionName: z.string().min(1),          // e.g., "DES Implantation", "TAVR"
    category: z.string().min(1),                  // InterventionCategory enum value
    status: z.string().default('PENDING'),
    cptCode: z.string().optional(),
    icd10Code: z.string().optional(),
    reimbursementCode: z.string().optional(),
    performingProvider: z.string().optional(),
    referringProvider: z.string().optional(),
    facility: z.string().optional(),
    estimatedReimbursement: z.number().optional(),
    description: z.string().optional(),
  })
  .strict();

export const updateInterventionStatusSchema = z
  .object({
    status: z.string().min(1),
    outcome: z.string().optional(),
    completedAt: z.string().datetime().optional(),
    complications: z.string().optional(),
  })
  .strict();

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRAINDICATION ASSESSMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const createContraindicationSchema = z
  .object({
    patientId: z.string().min(1),
    hospitalId: z.string().min(1),
    module: z.string().min(1),
    therapyName: z.string().min(1),          // Drug or intervention name
    therapyType: z.string().min(1),          // "medication" or "procedure"
    level: z.string().min(1),                // ContraindicationLevel enum value
    reasons: z.any(),                        // Array of contraindication reasons (Json)
    alternatives: z.any().optional(),        // Alternative therapies (Json)
    monitoring: z.any().optional(),          // Required monitoring if proceeding (Json)
    dosing: z.any().optional(),              // Recommended dosing adjustments (Json)
    assessedBy: z.string().optional(),
  })
  .strict();

export const overrideContraindicationSchema = z
  .object({
    overriddenBy: z.string().min(1),
    overrideReason: z.string().min(1),
  })
  .strict();

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT CRUD
// ═══════════════════════════════════════════════════════════════════════════════

const genderEnum = z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']);
const moduleType = z.enum([
  'HEART_FAILURE', 'ELECTROPHYSIOLOGY', 'STRUCTURAL_HEART',
  'CORONARY_INTERVENTION', 'PERIPHERAL_VASCULAR', 'VALVULAR_DISEASE',
]);

export const createPatientSchema = z
  .object({
    mrn: z.string().min(1, 'MRN is required'),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string().datetime({ message: 'dateOfBirth must be ISO 8601' }),
    gender: genderEnum,
    phone: z.string().optional(),
    email: z.string().email().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().max(2).optional(),
    zipCode: z.string().max(10).optional(),
    riskScore: z.number().min(0).max(100).optional(),
    riskCategory: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).optional(),
  })
  .strict();

export const updatePatientSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    dateOfBirth: z.string().datetime().optional(),
    gender: genderEnum.optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().max(2).optional(),
    zipCode: z.string().max(10).optional(),
    isActive: z.boolean().optional(),
    riskScore: z.number().min(0).max(100).optional(),
    riskCategory: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).optional(),
    heartFailurePatient: z.boolean().optional(),
    electrophysiologyPatient: z.boolean().optional(),
    structuralHeartPatient: z.boolean().optional(),
    coronaryPatient: z.boolean().optional(),
    peripheralVascularPatient: z.boolean().optional(),
    valvularDiseasePatient: z.boolean().optional(),
  })
  .strict();

// ═══════════════════════════════════════════════════════════════════════════════
// PHENOTYPE SCREENING
// ═══════════════════════════════════════════════════════════════════════════════

export const screenPhenotypeSchema = z
  .object({
    modules: z.array(moduleType).min(1, 'At least one module required'),
    forceRescreen: z.boolean().optional().default(false),
  })
  .strict();

export const confirmPhenotypeSchema = z
  .object({
    confirmed: z.boolean(),
    clinicianId: z.string().min(1),
    clinicianNotes: z.string().optional(),
    overrideClassification: z.string().optional(),
  })
  .strict();

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-MODULE REFERRALS
// ═══════════════════════════════════════════════════════════════════════════════

export const createReferralSchema = z
  .object({
    patientId: z.string().min(1),
    hospitalId: z.string().min(1),
    fromModule: moduleType,
    toModule: moduleType,
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    reason: z.string().min(1, 'Referral reason is required'),
    clinicalContext: z.string().optional(),
    referringProviderId: z.string().optional(),
  })
  .strict();

export const updateReferralStatusSchema = z
  .object({
    status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED']),
    notes: z.string().optional(),
    acceptedById: z.string().optional(),
  })
  .strict();

// ═══════════════════════════════════════════════════════════════════════════════
// CQL RULE EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

export const evaluateCQLSchema = z
  .object({
    patientId: z.string().min(1),
    hospitalId: z.string().min(1),
    ruleIds: z.array(z.string()).optional(),    // specific rules, or all
    modules: z.array(moduleType).optional(),     // filter by module
    includeRecommendations: z.boolean().optional().default(true),
  })
  .strict();

export const batchEvaluateCQLSchema = z
  .object({
    patientIds: z.array(z.string().min(1)).min(1).max(100),
    hospitalId: z.string().min(1),
    ruleIds: z.array(z.string()).optional(),
    modules: z.array(moduleType).optional(),
  })
  .strict();

// ═══════════════════════════════════════════════════════════════════════════════
// CLINICAL RULES ENGINE (GDMT)
// ═══════════════════════════════════════════════════════════════════════════════

export const createGDMTAssessmentSchema = z
  .object({
    patientId: z.string().min(1),
    hospitalId: z.string().min(1),
    currentMedications: z.array(z.object({
      drugClass: z.string().min(1),
      drugName: z.string().min(1),
      dose: z.number().positive(),
      unit: z.string().min(1),
      frequency: z.string().min(1),
    })),
    ejectionFraction: z.number().min(0).max(100).optional(),
    nyhaClass: z.enum(['I', 'II', 'III', 'IV']).optional(),
    systolicBP: z.number().min(40).max(300).optional(),
    heartRate: z.number().min(20).max(300).optional(),
    potassium: z.number().min(1).max(10).optional(),
    creatinine: z.number().min(0).max(30).optional(),
    eGFR: z.number().min(0).max(200).optional(),
  })
  .strict();

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL OPS — BAA & ONBOARDING
// ═══════════════════════════════════════════════════════════════════════════════

export const createBAASchema = z
  .object({
    hospitalId: z.string().min(1),
    signatoryName: z.string().min(1),
    signatoryTitle: z.string().min(1),
    signatoryEmail: z.string().email(),
    effectiveDate: z.string().datetime(),
    expirationDate: z.string().datetime().optional(),
  })
  .strict();

export const updateOnboardingStepSchema = z
  .object({
    completed: z.boolean(),
    notes: z.string().optional(),
  })
  .strict();

export const createInternalNoteSchema = z
  .object({
    hospitalId: z.string().min(1),
    noteType: z.enum(['ONBOARDING', 'SUPPORT', 'CLINICAL', 'BILLING', 'TECHNICAL']),
    title: z.string().min(1),
    content: z.string().min(1),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    isInternal: z.boolean().default(true),
  })
  .strict();

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export const trackEventSchema = z
  .object({
    eventType: z.string().min(1),
    eventCategory: z.string().optional(),
    eventData: z.record(z.any()).optional(),
    moduleType: moduleType.optional(),
    duration: z.number().min(0).optional(),
  })
  .strict();

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const acknowledgeAlertSchema = z
  .object({
    acknowledged: z.boolean(),
    notes: z.string().optional(),
  })
  .strict();

export const resolveAlertSchema = z
  .object({
    resolution: z.string().min(1, 'Resolution details required'),
    actionTaken: z.string().optional(),
  })
  .strict();
