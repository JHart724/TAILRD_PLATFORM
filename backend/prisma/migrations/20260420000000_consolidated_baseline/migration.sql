-- Migration: 20260420000000_consolidated_baseline
--
-- Consolidated baseline captured from production RDS (tailrd-production-postgres,
-- engine PostgreSQL 15.14) on 2026-04-20 via pg_dump --schema-only --no-owner --no-acl.
-- Replaces the fragmented migration history captured in four prior migrations
-- (20260326060741, 20260408132829, 20260413000000, 20260414220000, 20260419170743)
-- that did NOT reconstruct the production schema (tech debt register #16).
--
-- After this migration applies, a fresh Postgres database has the same 53 user
-- tables, 47 enums, 133 indexes (including the 4 global FHIR uniques that never
-- appeared in a committed migration), 78 foreign keys, and sequence state that
-- production RDS has today.
--
-- This file was stripped of:
--   * pg_dump session pragmas (SET statement_timeout, etc.)
--   * _prisma_migrations table (Prisma creates and manages this itself)
--   * Ownership / ACL statements (--no-owner --no-acl)
--
-- See docs/MIGRATION_HISTORY_CONSOLIDATION_2026_04_20.md for the full rationale
-- and the Phase C verification result.

--
--

--
-- Name: ActivityType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ActivityType" AS ENUM (
    'LOGIN',
    'LOGOUT',
    'PAGE_VIEW',
    'API_REQUEST',
    'SEARCH',
    'FILTER',
    'EXPORT',
    'CREATE',
    'UPDATE',
    'DELETE',
    'DOWNLOAD',
    'PRINT',
    'SHARE'
);

--
-- Name: AlertSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AlertSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

--
-- Name: AlertType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AlertType" AS ENUM (
    'CLINICAL',
    'ADMINISTRATIVE',
    'TECHNICAL',
    'SAFETY'
);

--
-- Name: BreachSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BreachSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

--
-- Name: BreachStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BreachStatus" AS ENUM (
    'DISCOVERED',
    'INVESTIGATING',
    'CONTAINED',
    'RISK_ASSESSED',
    'HHS_NOTIFIED',
    'INDIVIDUALS_NOTIFIED',
    'REMEDIATED',
    'CLOSED'
);

--
-- Name: BreachType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BreachType" AS ENUM (
    'UNAUTHORIZED_ACCESS',
    'UNAUTHORIZED_DISCLOSURE',
    'LOSS_OF_DATA',
    'THEFT_OF_DATA',
    'IMPROPER_DISPOSAL',
    'HACKING_IT_INCIDENT',
    'OTHER'
);

--
-- Name: BusinessCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BusinessCategory" AS ENUM (
    'USER_ENGAGEMENT',
    'CLINICAL_OUTCOMES',
    'OPERATIONAL_EFFICIENCY',
    'QUALITY_METRICS',
    'UTILIZATION',
    'ADOPTION',
    'SATISFACTION',
    'COMPLIANCE'
);

--
-- Name: CarePlanStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CarePlanStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'ON_HOLD',
    'REVOKED',
    'COMPLETED',
    'ENTERED_IN_ERROR'
);

--
-- Name: ConditionCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ConditionCategory" AS ENUM (
    'PROBLEM_LIST',
    'ENCOUNTER_DIAGNOSIS',
    'HEALTH_CONCERN'
);

--
-- Name: ConditionClinicalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ConditionClinicalStatus" AS ENUM (
    'ACTIVE',
    'RECURRENCE',
    'RELAPSE',
    'INACTIVE',
    'REMISSION',
    'RESOLVED'
);

--
-- Name: ConditionVerificationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ConditionVerificationStatus" AS ENUM (
    'UNCONFIRMED',
    'PROVISIONAL',
    'DIFFERENTIAL',
    'CONFIRMED',
    'REFUTED',
    'ENTERED_IN_ERROR'
);

--
-- Name: ContraindicationLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContraindicationLevel" AS ENUM (
    'SAFE',
    'MONITOR',
    'CAUTION',
    'RELATIVE',
    'ABSOLUTE'
);

--
-- Name: DataRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DataRequestStatus" AS ENUM (
    'PENDING',
    'IN_REVIEW',
    'APPROVED',
    'DENIED',
    'COMPLETED',
    'EXPIRED'
);

--
-- Name: DataRequestType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DataRequestType" AS ENUM (
    'ACCESS',
    'DELETION',
    'AMENDMENT',
    'RESTRICTION',
    'ACCOUNTING'
);

--
-- Name: DeviceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DeviceType" AS ENUM (
    'ICD',
    'CRT_P',
    'CRT_D',
    'PACEMAKER',
    'WATCHMAN',
    'MITRACLIP',
    'LVAD',
    'HEART_MATE',
    'DES',
    'BMS',
    'IVUS_CATHETER',
    'OCT_CATHETER',
    'FFR_WIRE',
    'IVL_CATHETER',
    'IMPELLA',
    'ROTABLATOR',
    'TAVR_VALVE',
    'SAVR_PROSTHESIS',
    'TEER_DEVICE',
    'TMVR_DEVICE',
    'PERIPHERAL_STENT',
    'DCB',
    'ATHERECTOMY_DEVICE',
    'BYPASS_GRAFT'
);

--
-- Name: DrugClassType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DrugClassType" AS ENUM (
    'ANTIPLATELET',
    'P2Y12_INHIBITOR',
    'ANTICOAGULANT_CORONARY',
    'STATIN',
    'NITRATE',
    'CCB_ANTIANGINAL',
    'RANOLAZINE',
    'ANTICOAGULANT_VALVE',
    'ANTIHYPERTENSIVE_VALVE',
    'DIURETIC_VALVE',
    'CILOSTAZOL',
    'ANTIPLATELET_PAD',
    'STATIN_PAD',
    'PENTOXIFYLLINE',
    'PROSTANOID',
    'ACE_ARB_ARNI_GENERAL',
    'BETA_BLOCKER_GENERAL',
    'MRA_GENERAL',
    'SGLT2I_GENERAL'
);

--
-- Name: EncounterStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EncounterStatus" AS ENUM (
    'PLANNED',
    'ARRIVED',
    'TRIAGED',
    'IN_PROGRESS',
    'ON_LEAVE',
    'FINISHED',
    'CANCELLED'
);

--
-- Name: EncounterType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EncounterType" AS ENUM (
    'INPATIENT',
    'OUTPATIENT',
    'EMERGENCY',
    'OBSERVATION',
    'DAY_SURGERY',
    'TELEHEALTH'
);

--
-- Name: ErrorSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ErrorSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

--
-- Name: FeatureCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FeatureCategory" AS ENUM (
    'DASHBOARD',
    'PATIENT_MANAGEMENT',
    'CLINICAL_DECISION_SUPPORT',
    'REPORTING',
    'ANALYTICS',
    'ADMINISTRATION',
    'COMMUNICATION',
    'DATA_EXPORT',
    'ALERTS',
    'WORKFLOWS'
);

--
-- Name: Gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Gender" AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER',
    'UNKNOWN'
);

--
-- Name: HFPillarType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HFPillarType" AS ENUM (
    'ACE_ARB_ARNI',
    'BETA_BLOCKER',
    'MRA',
    'SGLT2_INHIBITOR'
);

--
-- Name: HospitalType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HospitalType" AS ENUM (
    'COMMUNITY',
    'ACADEMIC',
    'SPECIALTY',
    'CRITICAL_ACCESS',
    'FEDERAL'
);

--
-- Name: InterventionCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InterventionCategory" AS ENUM (
    'PERCUTANEOUS',
    'SURGICAL',
    'DIAGNOSTIC',
    'IMAGING',
    'THERAPEUTIC',
    'PHARMACOLOGIC',
    'DEVICE_IMPLANT',
    'MONITORING'
);

--
-- Name: InterventionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InterventionStatus" AS ENUM (
    'ELIGIBLE',
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'DEFERRED',
    'CONTRAINDICATED'
);

--
-- Name: MedicationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MedicationStatus" AS ENUM (
    'ACTIVE',
    'DISCONTINUED',
    'ON_HOLD',
    'COMPLETED',
    'ENTERED_IN_ERROR'
);

--
-- Name: MetricType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MetricType" AS ENUM (
    'API_PERFORMANCE',
    'DATABASE_PERFORMANCE',
    'UI_PERFORMANCE',
    'SYSTEM_HEALTH',
    'NETWORK_LATENCY',
    'ERROR_TRACKING',
    'RESOURCE_UTILIZATION'
);

--
-- Name: ModuleType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ModuleType" AS ENUM (
    'HEART_FAILURE',
    'ELECTROPHYSIOLOGY',
    'STRUCTURAL_HEART',
    'CORONARY_INTERVENTION',
    'PERIPHERAL_VASCULAR',
    'VALVULAR_DISEASE'
);

--
-- Name: ObservationCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ObservationCategory" AS ENUM (
    'VITAL_SIGNS',
    'LABORATORY',
    'IMAGING',
    'PROCEDURE',
    'SURVEY',
    'EXAM',
    'THERAPY'
);

--
-- Name: OnboardingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OnboardingStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'EXPIRED',
    'TERMINATED',
    'BLOCKED'
);

--
-- Name: OrderPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderPriority" AS ENUM (
    'ROUTINE',
    'URGENT',
    'ASAP',
    'STAT'
);

--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'ON_HOLD',
    'REVOKED',
    'COMPLETED',
    'ENTERED_IN_ERROR',
    'UNKNOWN'
);

--
-- Name: OrderType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderType" AS ENUM (
    'LABORATORY',
    'IMAGING',
    'PROCEDURE',
    'MEDICATION',
    'CONSULT',
    'THERAPY',
    'DIET',
    'NURSING'
);

--
-- Name: PhenotypeStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PhenotypeStatus" AS ENUM (
    'DETECTED',
    'SUSPECTED',
    'RULED_OUT',
    'CONFIRMED',
    'MONITORING'
);

--
-- Name: PhenotypeType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PhenotypeType" AS ENUM (
    'CARDIAC_AMYLOIDOSIS',
    'CARDIAC_SARCOIDOSIS',
    'HCM',
    'ARVC',
    'LVNC',
    'FABRY_DISEASE',
    'IRON_DEFICIENCY_HF',
    'PERIPARTUM_CARDIOMYOPATHY',
    'CHEMOTHERAPY_CARDIOMYOPATHY',
    'CHAGAS_CARDIOMYOPATHY',
    'TACHYCARDIA_CARDIOMYOPATHY',
    'AUTOIMMUNE_MYOCARDITIS',
    'CMD',
    'SCAD',
    'CORONARY_ECTASIA',
    'VASOSPASTIC_ANGINA',
    'IN_STENT_RESTENOSIS',
    'THROMBOTIC_CAD',
    'CALCIFIC_CAD',
    'LEFT_MAIN_DISEASE',
    'MYOCARDIAL_BRIDGING',
    'CORONARY_FISTULA',
    'LFLG_AORTIC_STENOSIS',
    'BPV_DEGENERATION',
    'INFECTIVE_ENDOCARDITIS',
    'RHEUMATIC_VALVE',
    'MARFAN_VALVE',
    'PARAVALVULAR_LEAK',
    'RADIATION_VALVE',
    'CARCINOID_VALVE',
    'CLTI',
    'DIABETIC_FOOT',
    'BLUE_TOE_SYNDROME',
    'POPLITEAL_ENTRAPMENT',
    'FMD',
    'BUERGER_DISEASE',
    'ADVENTITIAL_CYSTIC',
    'MALS'
);

--
-- Name: RecommendationPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RecommendationPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);

--
-- Name: RecommendationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RecommendationType" AS ENUM (
    'MEDICATION',
    'PROCEDURE',
    'FOLLOWUP',
    'LIFESTYLE',
    'MONITORING',
    'REFERRAL'
);

--
-- Name: ReferralStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReferralStatus" AS ENUM (
    'TRIGGERED',
    'REVIEWED',
    'ACCEPTED',
    'DECLINED',
    'COMPLETED',
    'EXPIRED'
);

--
-- Name: ReferralUrgency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReferralUrgency" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);

--
-- Name: ReportStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReportStatus" AS ENUM (
    'PENDING',
    'GENERATING',
    'COMPLETED',
    'FAILED',
    'EXPIRED'
);

--
-- Name: RiskCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RiskCategory" AS ENUM (
    'LOW',
    'MODERATE',
    'HIGH',
    'CRITICAL'
);

--
-- Name: RiskScoreType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RiskScoreType" AS ENUM (
    'MAGGIC',
    'SHFM',
    'CHA2DS2_VASC',
    'HAS_BLED',
    'STS_SCORE',
    'EUROSCORE_II',
    'GRACE',
    'SYNTAX',
    'TIMI',
    'HEART_SCORE',
    'DUKE_JEOPARDY',
    'ABI_ASSESSMENT',
    'FONTAINE',
    'RUTHERFORD',
    'WIFI',
    'STS_PROM',
    'EUROSCORE_LOG',
    'GDMT_OPTIMIZATION'
);

--
-- Name: SubscriptionTier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubscriptionTier" AS ENUM (
    'BASIC',
    'PROFESSIONAL',
    'ENTERPRISE'
);

--
-- Name: TherapyGapType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TherapyGapType" AS ENUM (
    'MEDICATION_MISSING',
    'MEDICATION_UNDERDOSED',
    'MEDICATION_CONTRAINDICATED',
    'DEVICE_ELIGIBLE',
    'DEVICE_UPGRADE_DUE',
    'MONITORING_OVERDUE',
    'FOLLOWUP_OVERDUE',
    'PROCEDURE_INDICATED',
    'SCREENING_DUE',
    'REFERRAL_NEEDED',
    'DOCUMENTATION_GAP',
    'SAFETY_ALERT',
    'REHABILITATION_ELIGIBLE',
    'IMAGING_OVERDUE'
);

--
-- Name: UploadJobStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UploadJobStatus" AS ENUM (
    'PENDING',
    'VALIDATING',
    'PROCESSING',
    'DETECTING_GAPS',
    'COMPLETE',
    'FAILED',
    'REJECTED_PHI'
);

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPER_ADMIN',
    'HOSPITAL_ADMIN',
    'PHYSICIAN',
    'NURSE_MANAGER',
    'QUALITY_DIRECTOR',
    'ANALYST',
    'VIEWER'
);

--
-- Name: WebhookStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WebhookStatus" AS ENUM (
    'RECEIVED',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'RETRYING'
);

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerts (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "assignedUserId" text,
    "alertType" public."AlertType" NOT NULL,
    severity public."AlertSeverity" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "moduleType" public."ModuleType" NOT NULL,
    "actionRequired" boolean DEFAULT false NOT NULL,
    "isAcknowledged" boolean DEFAULT false NOT NULL,
    "triggeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "acknowledgedAt" timestamp(3) without time zone,
    "resolvedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "triggerData" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);

--
-- Name: allergy_intolerances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allergy_intolerances (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "fhirAllergyId" text,
    "substanceCode" text,
    "substanceName" text,
    "allergyType" text DEFAULT 'allergy'::text NOT NULL,
    severity text,
    "clinicalStatus" text DEFAULT 'active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "hospitalId" text NOT NULL,
    "userId" text NOT NULL,
    "userEmail" text NOT NULL,
    "userRole" text NOT NULL,
    "ipAddress" text,
    action text NOT NULL,
    "resourceType" text NOT NULL,
    "resourceId" text,
    "patientId" text,
    description text,
    "previousValues" jsonb,
    "newValues" jsonb,
    metadata jsonb,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: bpci_episodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bpci_episodes (
    id text NOT NULL,
    "hospitalId" text NOT NULL,
    "patientId" text NOT NULL,
    "episodeType" text NOT NULL,
    "anchorAdmission" timestamp(3) without time zone NOT NULL,
    "episodeEnd" timestamp(3) without time zone,
    "targetPrice" double precision,
    "actualSpend" double precision,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: breach_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.breach_incidents (
    id text NOT NULL,
    "hospitalId" text,
    "discoveredAt" timestamp(3) without time zone NOT NULL,
    "discoveredBy" text NOT NULL,
    "incidentType" public."BreachType" NOT NULL,
    severity public."BreachSeverity" NOT NULL,
    description text NOT NULL,
    "affectedRecords" integer,
    "affectedFields" text[],
    "affectedPatientIds" text[],
    "investigationStarted" timestamp(3) without time zone,
    "riskAssessmentCompleted" timestamp(3) without time zone,
    "hhsNotifiedAt" timestamp(3) without time zone,
    "individualsNotifiedAt" timestamp(3) without time zone,
    "mediaNotifiedAt" timestamp(3) without time zone,
    "rootCause" text,
    "containmentActions" text,
    "remediationPlan" text,
    status public."BreachStatus" DEFAULT 'DISCOVERED'::public."BreachStatus" NOT NULL,
    "statusHistory" jsonb,
    "internalNotes" text,
    "legalReview" boolean DEFAULT false NOT NULL,
    "legalReviewedBy" text,
    "legalReviewedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: business_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_metrics (
    id text NOT NULL,
    "hospitalId" text NOT NULL,
    "metricName" text NOT NULL,
    category public."BusinessCategory" NOT NULL,
    "moduleType" public."ModuleType",
    value double precision NOT NULL,
    target double precision,
    "previousValue" double precision,
    dimension1 text,
    "dimension1Value" text,
    dimension2 text,
    "dimension2Value" text,
    period text NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    unit text,
    description text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: care_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.care_plans (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    title text NOT NULL,
    description text,
    status public."CarePlanStatus" DEFAULT 'ACTIVE'::public."CarePlanStatus" NOT NULL,
    intent text DEFAULT 'plan'::text NOT NULL,
    category text,
    "moduleType" public."ModuleType",
    "periodStart" timestamp(3) without time zone,
    "periodEnd" timestamp(3) without time zone,
    goals jsonb,
    activities jsonb,
    author text,
    "careTeam" jsonb,
    "fhirCarePlanId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: cds_hooks_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cds_hooks_sessions (
    id text NOT NULL,
    "hookId" text NOT NULL,
    "fhirContext" jsonb NOT NULL,
    "patientId" text,
    "hospitalId" text NOT NULL,
    cards jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conditions (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "conditionName" text NOT NULL,
    "icd10Code" text,
    "snomedCode" text,
    category public."ConditionCategory" DEFAULT 'PROBLEM_LIST'::public."ConditionCategory" NOT NULL,
    "clinicalStatus" public."ConditionClinicalStatus" DEFAULT 'ACTIVE'::public."ConditionClinicalStatus" NOT NULL,
    "verificationStatus" public."ConditionVerificationStatus" DEFAULT 'CONFIRMED'::public."ConditionVerificationStatus" NOT NULL,
    severity text,
    "onsetDate" timestamp(3) without time zone,
    "abatementDate" timestamp(3) without time zone,
    "recordedDate" timestamp(3) without time zone,
    "recordedBy" text,
    "bodySite" text,
    "fhirConditionId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: contraindication_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contraindication_assessments (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    module public."ModuleType" NOT NULL,
    "therapyName" text NOT NULL,
    "therapyType" text NOT NULL,
    level public."ContraindicationLevel" NOT NULL,
    reasons jsonb NOT NULL,
    alternatives jsonb,
    monitoring jsonb,
    dosing jsonb,
    "assessedBy" text,
    "overriddenBy" text,
    "overrideReason" text,
    "assessedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "validUntil" timestamp(3) without time zone,
    "supersededBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: cql_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cql_results (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "ruleId" text NOT NULL,
    result jsonb NOT NULL,
    severity public."AlertSeverity" NOT NULL,
    recommendation text,
    "acknowledgedAt" timestamp(3) without time zone,
    "acknowledgedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: cql_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cql_rules (
    id text NOT NULL,
    name text NOT NULL,
    version text NOT NULL,
    module public."ModuleType" NOT NULL,
    category text NOT NULL,
    "filePath" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastExecuted" timestamp(3) without time zone,
    "executionCount" integer DEFAULT 0 NOT NULL,
    description text,
    "authoredBy" text,
    "evidenceLevel" text,
    "guidelineSource" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: cross_referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cross_referrals (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "fromModule" public."ModuleType" NOT NULL,
    "toModule" public."ModuleType" NOT NULL,
    reason text NOT NULL,
    urgency public."ReferralUrgency" NOT NULL,
    status public."ReferralStatus" NOT NULL,
    "triggeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedAt" timestamp(3) without time zone,
    "reviewedBy" text,
    "acceptedAt" timestamp(3) without time zone,
    "acceptedBy" text,
    "completedAt" timestamp(3) without time zone,
    "completedBy" text,
    "triggerData" jsonb,
    notes text
);

--
-- Name: device_eligibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_eligibility (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "deviceType" public."DeviceType" NOT NULL,
    "deviceModel" text,
    eligible boolean NOT NULL,
    "eligibilityScore" double precision,
    criteria jsonb NOT NULL,
    barriers jsonb,
    indication text,
    contraindications jsonb,
    "evaluatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "evaluatedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "reviewedBy" text,
    implanted boolean DEFAULT false NOT NULL,
    "implantedAt" timestamp(3) without time zone,
    "declinedReason" text
);

--
-- Name: device_implants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_implants (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "fhirDeviceId" text,
    "deviceType" text NOT NULL,
    "deviceStatus" text DEFAULT 'active'::text NOT NULL,
    "implantDate" timestamp(3) without time zone,
    manufacturer text,
    "modelNumber" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: drug_interaction_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drug_interaction_alerts (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "drug1RxNorm" text NOT NULL,
    "drug1Name" text NOT NULL,
    "drug2RxNorm" text NOT NULL,
    "drug2Name" text NOT NULL,
    "interactionType" text NOT NULL,
    severity text NOT NULL,
    recommendation text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "acknowledgedBy" text,
    "acknowledgedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: drug_titrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drug_titrations (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "drugClass" public."HFPillarType",
    "generalDrugClass" public."DrugClassType",
    module public."ModuleType" DEFAULT 'HEART_FAILURE'::public."ModuleType" NOT NULL,
    "drugName" text NOT NULL,
    "currentDose" double precision NOT NULL,
    "currentDoseUnit" text NOT NULL,
    "targetDose" double precision NOT NULL,
    "targetDoseUnit" text NOT NULL,
    "nextStepDate" timestamp(3) without time zone,
    "nextStepDose" double precision,
    "titrationStep" integer DEFAULT 1 NOT NULL,
    barriers jsonb,
    "monitoringPlan" jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "pausedReason" text,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: encounters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.encounters (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "encounterNumber" text NOT NULL,
    "encounterType" public."EncounterType" NOT NULL,
    status public."EncounterStatus" NOT NULL,
    "startDateTime" timestamp(3) without time zone NOT NULL,
    "endDateTime" timestamp(3) without time zone,
    department text,
    location text,
    "attendingProvider" text,
    "chiefComplaint" text,
    "primaryDiagnosis" text,
    "diagnosisCodes" jsonb,
    "fhirEncounterId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);

--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_logs (
    id text NOT NULL,
    "hospitalId" text,
    "userId" text,
    "errorType" text NOT NULL,
    "errorCode" text,
    "errorMessage" text NOT NULL,
    "stackTrace" text,
    endpoint text,
    method text,
    "requestId" text,
    "userAgent" text,
    "ipAddress" text,
    "serverInstance" text,
    environment text,
    version text,
    severity public."ErrorSeverity" NOT NULL,
    "isResolved" boolean DEFAULT false NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "resolvedBy" text,
    "errorHash" text,
    "occurrenceCount" integer DEFAULT 1 NOT NULL,
    "firstOccurrence" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastOccurrence" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: failed_fhir_bundles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failed_fhir_bundles (
    id text NOT NULL,
    "originalPath" text NOT NULL,
    "patientFhirId" text,
    "hospitalId" text,
    "errorMessage" text NOT NULL,
    "retryCount" integer DEFAULT 0 NOT NULL,
    "failedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone
);

--
-- Name: feature_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_usage (
    id text NOT NULL,
    "hospitalId" text NOT NULL,
    "userId" text,
    "featureName" text NOT NULL,
    "moduleType" public."ModuleType",
    category public."FeatureCategory" NOT NULL,
    "usageCount" integer DEFAULT 1 NOT NULL,
    "totalDuration" integer DEFAULT 0 NOT NULL,
    "lastUsed" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    period text NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: hospitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hospitals (
    id text NOT NULL,
    name text NOT NULL,
    system text,
    npi text,
    "patientCount" integer NOT NULL,
    "bedCount" integer NOT NULL,
    "hospitalType" public."HospitalType" NOT NULL,
    street text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    "zipCode" text NOT NULL,
    country text DEFAULT 'USA'::text NOT NULL,
    "redoxSourceId" text,
    "redoxDestinationId" text,
    "redoxWebhookUrl" text,
    "redoxIsActive" boolean DEFAULT true NOT NULL,
    "moduleHeartFailure" boolean DEFAULT false NOT NULL,
    "moduleElectrophysiology" boolean DEFAULT false NOT NULL,
    "moduleStructuralHeart" boolean DEFAULT false NOT NULL,
    "moduleCoronaryIntervention" boolean DEFAULT false NOT NULL,
    "modulePeripheralVascular" boolean DEFAULT false NOT NULL,
    "moduleValvularDisease" boolean DEFAULT false NOT NULL,
    "subscriptionTier" public."SubscriptionTier" NOT NULL,
    "subscriptionStart" timestamp(3) without time zone NOT NULL,
    "subscriptionEnd" timestamp(3) without time zone,
    "subscriptionActive" boolean DEFAULT true NOT NULL,
    "maxUsers" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: internal_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internal_notes (
    id text NOT NULL,
    "hospitalId" text NOT NULL,
    "noteType" text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    priority text DEFAULT 'MEDIUM'::text NOT NULL,
    "isInternal" boolean DEFAULT true NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: intervention_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intervention_tracking (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "interventionName" text NOT NULL,
    category public."InterventionCategory" NOT NULL,
    module public."ModuleType" NOT NULL,
    status public."InterventionStatus" NOT NULL,
    "cptCode" text,
    "icd10Code" text,
    "reimbursementCode" text,
    "scheduledAt" timestamp(3) without time zone,
    "performedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "performingProvider" text,
    "referringProvider" text,
    facility text,
    indication text,
    technique text,
    findings jsonb,
    complications jsonb,
    outcome text,
    "followUpPlan" text,
    "nextAssessment" timestamp(3) without time zone,
    "estimatedReimbursement" double precision,
    "actualReimbursement" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: invite_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invite_tokens (
    id text NOT NULL,
    "hospitalId" text NOT NULL,
    "createdById" text NOT NULL,
    email text NOT NULL,
    role public."UserRole" NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: ip_allowlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_allowlist (
    id text NOT NULL,
    "userId" text NOT NULL,
    "ipAddress" text NOT NULL,
    label text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUsedAt" timestamp(3) without time zone
);

--
-- Name: login_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_sessions (
    id text NOT NULL,
    "userId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "sessionToken" text NOT NULL,
    "ipAddress" text NOT NULL,
    "userAgent" text,
    "loginTime" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastActivity" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    location text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medications (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "medicationName" text NOT NULL,
    "genericName" text,
    "rxNormCode" text,
    ndc text,
    "drugClass" text,
    dose text,
    "doseValue" double precision,
    "doseUnit" text,
    route text,
    frequency text,
    status public."MedicationStatus" DEFAULT 'ACTIVE'::public."MedicationStatus" NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "discontinuedReason" text,
    "prescribedBy" text,
    "prescribedDate" timestamp(3) without time zone,
    "targetDose" text,
    "targetDoseValue" double precision,
    "atTargetDose" boolean DEFAULT false NOT NULL,
    "percentOfTarget" double precision,
    "fhirMedicationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.observations (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "encounterId" text,
    "hospitalId" text NOT NULL,
    "observationType" text NOT NULL,
    "observationName" text NOT NULL,
    category public."ObservationCategory" NOT NULL,
    "valueNumeric" double precision,
    "valueText" text,
    "valueBoolean" boolean,
    unit text,
    "referenceRangeLow" double precision,
    "referenceRangeHigh" double precision,
    "isAbnormal" boolean DEFAULT false NOT NULL,
    "observedDateTime" timestamp(3) without time zone NOT NULL,
    "resultDateTime" timestamp(3) without time zone,
    "orderingProvider" text,
    "performingLab" text,
    "fhirObservationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);

--
-- Name: onboarding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding (
    id text NOT NULL,
    "hospitalId" text NOT NULL,
    "stepName" text NOT NULL,
    status public."OnboardingStatus" DEFAULT 'PENDING'::public."OnboardingStatus" NOT NULL,
    "stepData" jsonb,
    notes text,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "encounterId" text,
    "hospitalId" text NOT NULL,
    "orderType" public."OrderType" NOT NULL,
    "orderCode" text,
    "orderName" text NOT NULL,
    status public."OrderStatus" NOT NULL,
    priority public."OrderPriority" NOT NULL,
    "orderedDateTime" timestamp(3) without time zone NOT NULL,
    "scheduledDateTime" timestamp(3) without time zone,
    "completedDateTime" timestamp(3) without time zone,
    "orderingProvider" text NOT NULL,
    "performingDepartment" text,
    indication text,
    instructions text,
    "fhirOrderId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);

--
-- Name: patient_data_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_data_requests (
    id text NOT NULL,
    "hospitalId" text NOT NULL,
    "patientId" text NOT NULL,
    "requestType" public."DataRequestType" NOT NULL,
    "requestedBy" text NOT NULL,
    "requestorEmail" text,
    "requestorRelation" text,
    status public."DataRequestStatus" DEFAULT 'PENDING'::public."DataRequestStatus" NOT NULL,
    notes text,
    "assignedTo" text,
    "processedAt" timestamp(3) without time zone,
    "responseNotes" text,
    "denialReason" text,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "extensionGranted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id text NOT NULL,
    "hospitalId" text NOT NULL,
    mrn text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "dateOfBirth" text NOT NULL,
    gender public."Gender" NOT NULL,
    phone text,
    email text,
    street text,
    city text,
    state text,
    "zipCode" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "riskScore" double precision,
    "riskCategory" public."RiskCategory",
    "lastAssessment" timestamp(3) without time zone,
    "heartFailurePatient" boolean DEFAULT false NOT NULL,
    "electrophysiologyPatient" boolean DEFAULT false NOT NULL,
    "structuralHeartPatient" boolean DEFAULT false NOT NULL,
    "coronaryPatient" boolean DEFAULT false NOT NULL,
    "peripheralVascularPatient" boolean DEFAULT false NOT NULL,
    "valvularDiseasePatient" boolean DEFAULT false NOT NULL,
    "fhirPatientId" text,
    "lastEHRSync" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    ethnicity text,
    race text,
    "mergedIntoId" text,
    "mergedAt" timestamp(3) without time zone,
    "isMerged" boolean DEFAULT false NOT NULL
);

--
-- Name: performance_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_metrics (
    id text NOT NULL,
    "hospitalId" text,
    "metricType" public."MetricType" NOT NULL,
    endpoint text,
    operation text NOT NULL,
    "responseTime" double precision NOT NULL,
    throughput double precision,
    "errorRate" double precision,
    "p95ResponseTime" double precision,
    "p99ResponseTime" double precision,
    "requestCount" integer NOT NULL,
    "errorCount" integer DEFAULT 0 NOT NULL,
    "cpuUsage" double precision,
    "memoryUsage" double precision,
    "dbQueries" integer,
    period text NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: phenotypes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phenotypes (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "phenotypeName" public."PhenotypeType" NOT NULL,
    status public."PhenotypeStatus" NOT NULL,
    confidence double precision NOT NULL,
    evidence jsonb NOT NULL,
    "detectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "confirmedAt" timestamp(3) without time zone,
    "confirmedBy" text,
    "riskScore" double precision,
    "riskFactors" jsonb
);

--
-- Name: procedures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procedures (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "fhirProcedureId" text,
    "cptCode" text,
    "snomedCode" text,
    "procedureName" text,
    status text DEFAULT 'completed'::text NOT NULL,
    "procedureDate" timestamp(3) without time zone,
    "performedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: quality_measures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_measures (
    id text NOT NULL,
    "hospitalId" text NOT NULL,
    "measureCode" text NOT NULL,
    "measureName" text NOT NULL,
    "measureDescription" text,
    numerator integer NOT NULL,
    denominator integer NOT NULL,
    rate double precision NOT NULL,
    "reportingPeriod" text NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    "nationalBenchmark" double precision,
    target double precision,
    "previousRate" double precision,
    exclusions integer,
    "exclusionReasons" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recommendations (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "assignedUserId" text,
    "recommendationType" public."RecommendationType" NOT NULL,
    priority public."RecommendationPriority" NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    evidence text,
    "moduleType" public."ModuleType" NOT NULL,
    "isImplemented" boolean DEFAULT false NOT NULL,
    "implementedAt" timestamp(3) without time zone,
    "implementationNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "evidenceLevel" text,
    "guidelineSource" text,
    "hospitalId" text NOT NULL
);

--
-- Name: report_generations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_generations (
    id text NOT NULL,
    "userId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "reportType" text NOT NULL,
    "reportName" text NOT NULL,
    "moduleType" public."ModuleType",
    "dateRange" jsonb,
    filters jsonb,
    parameters jsonb,
    "generationTime" integer NOT NULL,
    "recordCount" integer,
    "fileSize" integer,
    "exportFormat" text,
    status public."ReportStatus" NOT NULL,
    "errorMessage" text,
    "fileName" text,
    "filePath" text,
    "downloadCount" integer DEFAULT 0 NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);

--
-- Name: risk_score_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_score_assessments (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "scoreType" public."RiskScoreType" NOT NULL,
    module public."ModuleType" NOT NULL,
    "totalScore" double precision NOT NULL,
    "riskCategory" public."RiskCategory" NOT NULL,
    components jsonb NOT NULL,
    "inputData" jsonb NOT NULL,
    interpretation text NOT NULL,
    recommendation text,
    mortality double precision,
    "eventRisk" double precision,
    "calculatedBy" text,
    "clinicalContext" text,
    "calculatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "validUntil" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: term_cpt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.term_cpt (
    code text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: term_gap_valueset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.term_gap_valueset (
    "gapId" text NOT NULL,
    "gapName" text NOT NULL,
    module text NOT NULL,
    "diagnosisCodes" text[],
    "exclusionCodes" text[],
    "procedureCodes" text[],
    "medicationCodes" text[],
    "labCodes" text[],
    "labThresholds" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "deviceCodes" text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: term_icd10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.term_icd10 (
    code text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    "isLeaf" boolean DEFAULT true NOT NULL,
    "parentCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: term_loinc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.term_loinc (
    "loincNum" text NOT NULL,
    component text NOT NULL,
    system text NOT NULL,
    "scaleType" text NOT NULL,
    "className" text NOT NULL,
    unit text DEFAULT ''::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: term_msdrg; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.term_msdrg (
    "drgCode" text NOT NULL,
    description text NOT NULL,
    mdc text NOT NULL,
    type text NOT NULL,
    "avgPayment" double precision NOT NULL,
    "relWeight" double precision NOT NULL,
    "fiscalYear" integer DEFAULT 2025 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: term_rxnorm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.term_rxnorm (
    rxcui text NOT NULL,
    name text NOT NULL,
    "termType" text NOT NULL,
    "drugClasses" text[],
    "brandNames" text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: therapy_gaps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.therapy_gaps (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "hospitalId" text NOT NULL,
    "gapType" public."TherapyGapType" NOT NULL,
    module public."ModuleType" NOT NULL,
    medication text,
    device text,
    "currentStatus" text NOT NULL,
    "targetStatus" text NOT NULL,
    "identifiedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "resolvedBy" text,
    barriers jsonb,
    recommendations jsonb
);

--
-- Name: upload_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upload_jobs (
    id text NOT NULL,
    "hospitalId" text NOT NULL,
    "uploadedBy" text NOT NULL,
    "fileName" text NOT NULL,
    "fileSize" integer NOT NULL,
    "s3Key" text,
    "moduleId" text NOT NULL,
    status public."UploadJobStatus" DEFAULT 'PENDING'::public."UploadJobStatus" NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "errorMessage" text,
    "phiDetected" boolean DEFAULT false NOT NULL,
    "totalRows" integer DEFAULT 0 NOT NULL,
    "processedRows" integer DEFAULT 0 NOT NULL,
    "errorRows" integer DEFAULT 0 NOT NULL,
    "patientsCreated" integer DEFAULT 0 NOT NULL,
    "patientsUpdated" integer DEFAULT 0 NOT NULL,
    "gapFlagsCreated" integer DEFAULT 0 NOT NULL,
    "validationErrors" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: user_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_activities (
    id text NOT NULL,
    "userId" text,
    "hospitalId" text NOT NULL,
    "sessionId" text NOT NULL,
    "ipAddress" text NOT NULL,
    "userAgent" text,
    "activityType" public."ActivityType" NOT NULL,
    action text NOT NULL,
    "resourceType" text,
    "resourceId" text,
    "moduleType" public."ModuleType",
    path text NOT NULL,
    method text NOT NULL,
    duration integer,
    metadata jsonb,
    "responseTime" integer,
    success boolean DEFAULT true NOT NULL,
    "errorMessage" text,
    country text,
    region text,
    city text,
    "deviceType" text,
    "browserName" text,
    "osName" text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: user_mfa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_mfa (
    id text NOT NULL,
    "userId" text NOT NULL,
    secret text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    "enabledAt" timestamp(3) without time zone,
    "backupCodes" text[],
    "backupCodesUsed" integer DEFAULT 0 NOT NULL,
    "lastUsedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "ipAddress" text NOT NULL,
    "userAgent" text NOT NULL,
    "lastActivity" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "mfaVerified" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    title text,
    department text,
    npi text,
    role public."UserRole" NOT NULL,
    "hospitalId" text NOT NULL,
    "permHeartFailure" boolean DEFAULT false NOT NULL,
    "permElectrophysiology" boolean DEFAULT false NOT NULL,
    "permStructuralHeart" boolean DEFAULT false NOT NULL,
    "permCoronaryIntervention" boolean DEFAULT false NOT NULL,
    "permPeripheralVascular" boolean DEFAULT false NOT NULL,
    "permValvularDisease" boolean DEFAULT false NOT NULL,
    "permExecutiveView" boolean DEFAULT false NOT NULL,
    "permServiceLineView" boolean DEFAULT false NOT NULL,
    "permCareTeamView" boolean DEFAULT false NOT NULL,
    "permViewReports" boolean DEFAULT true NOT NULL,
    "permExportData" boolean DEFAULT false NOT NULL,
    "permManageUsers" boolean DEFAULT false NOT NULL,
    "permConfigureAlerts" boolean DEFAULT false NOT NULL,
    "permAccessPHI" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastLogin" timestamp(3) without time zone,
    "resetToken" text,
    "resetTokenExpiry" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "notificationPreferences" jsonb,
    "samlNameId" text,
    "samlSessionIndex" text,
    "ssoProvider" text,
    "lastSsoLogin" timestamp(3) without time zone,
    "isVerified" boolean DEFAULT false NOT NULL
);

--
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_events (
    id text NOT NULL,
    "hospitalId" text NOT NULL,
    "eventType" text NOT NULL,
    "eventId" text NOT NULL,
    "sourceSystem" text NOT NULL,
    status public."WebhookStatus" NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "errorMessage" text,
    "retryCount" integer DEFAULT 0 NOT NULL,
    "rawPayload" jsonb NOT NULL,
    "processedData" jsonb,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "eventDateTime" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "patientId" text
);

--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);

--
-- Name: allergy_intolerances allergy_intolerances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allergy_intolerances
    ADD CONSTRAINT allergy_intolerances_pkey PRIMARY KEY (id);

--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

--
-- Name: bpci_episodes bpci_episodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bpci_episodes
    ADD CONSTRAINT bpci_episodes_pkey PRIMARY KEY (id);

--
-- Name: breach_incidents breach_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.breach_incidents
    ADD CONSTRAINT breach_incidents_pkey PRIMARY KEY (id);

--
-- Name: business_metrics business_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_metrics
    ADD CONSTRAINT business_metrics_pkey PRIMARY KEY (id);

--
-- Name: care_plans care_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_plans
    ADD CONSTRAINT care_plans_pkey PRIMARY KEY (id);

--
-- Name: cds_hooks_sessions cds_hooks_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cds_hooks_sessions
    ADD CONSTRAINT cds_hooks_sessions_pkey PRIMARY KEY (id);

--
-- Name: conditions conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conditions
    ADD CONSTRAINT conditions_pkey PRIMARY KEY (id);

--
-- Name: contraindication_assessments contraindication_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contraindication_assessments
    ADD CONSTRAINT contraindication_assessments_pkey PRIMARY KEY (id);

--
-- Name: cql_results cql_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cql_results
    ADD CONSTRAINT cql_results_pkey PRIMARY KEY (id);

--
-- Name: cql_rules cql_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cql_rules
    ADD CONSTRAINT cql_rules_pkey PRIMARY KEY (id);

--
-- Name: cross_referrals cross_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_referrals
    ADD CONSTRAINT cross_referrals_pkey PRIMARY KEY (id);

--
-- Name: device_eligibility device_eligibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_eligibility
    ADD CONSTRAINT device_eligibility_pkey PRIMARY KEY (id);

--
-- Name: device_implants device_implants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_implants
    ADD CONSTRAINT device_implants_pkey PRIMARY KEY (id);

--
-- Name: drug_interaction_alerts drug_interaction_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drug_interaction_alerts
    ADD CONSTRAINT drug_interaction_alerts_pkey PRIMARY KEY (id);

--
-- Name: drug_titrations drug_titrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drug_titrations
    ADD CONSTRAINT drug_titrations_pkey PRIMARY KEY (id);

--
-- Name: encounters encounters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_pkey PRIMARY KEY (id);

--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (id);

--
-- Name: failed_fhir_bundles failed_fhir_bundles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_fhir_bundles
    ADD CONSTRAINT failed_fhir_bundles_pkey PRIMARY KEY (id);

--
-- Name: feature_usage feature_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_usage
    ADD CONSTRAINT feature_usage_pkey PRIMARY KEY (id);

--
-- Name: hospitals hospitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_pkey PRIMARY KEY (id);

--
-- Name: internal_notes internal_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_notes
    ADD CONSTRAINT internal_notes_pkey PRIMARY KEY (id);

--
-- Name: intervention_tracking intervention_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervention_tracking
    ADD CONSTRAINT intervention_tracking_pkey PRIMARY KEY (id);

--
-- Name: invite_tokens invite_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_tokens
    ADD CONSTRAINT invite_tokens_pkey PRIMARY KEY (id);

--
-- Name: ip_allowlist ip_allowlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_allowlist
    ADD CONSTRAINT ip_allowlist_pkey PRIMARY KEY (id);

--
-- Name: login_sessions login_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_sessions
    ADD CONSTRAINT login_sessions_pkey PRIMARY KEY (id);

--
-- Name: medications medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_pkey PRIMARY KEY (id);

--
-- Name: observations observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT observations_pkey PRIMARY KEY (id);

--
-- Name: onboarding onboarding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding
    ADD CONSTRAINT onboarding_pkey PRIMARY KEY (id);

--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

--
-- Name: patient_data_requests patient_data_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_data_requests
    ADD CONSTRAINT patient_data_requests_pkey PRIMARY KEY (id);

--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);

--
-- Name: performance_metrics performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_metrics
    ADD CONSTRAINT performance_metrics_pkey PRIMARY KEY (id);

--
-- Name: phenotypes phenotypes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phenotypes
    ADD CONSTRAINT phenotypes_pkey PRIMARY KEY (id);

--
-- Name: procedures procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_pkey PRIMARY KEY (id);

--
-- Name: quality_measures quality_measures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_measures
    ADD CONSTRAINT quality_measures_pkey PRIMARY KEY (id);

--
-- Name: recommendations recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_pkey PRIMARY KEY (id);

--
-- Name: report_generations report_generations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_generations
    ADD CONSTRAINT report_generations_pkey PRIMARY KEY (id);

--
-- Name: risk_score_assessments risk_score_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_score_assessments
    ADD CONSTRAINT risk_score_assessments_pkey PRIMARY KEY (id);

--
-- Name: term_cpt term_cpt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.term_cpt
    ADD CONSTRAINT term_cpt_pkey PRIMARY KEY (code);

--
-- Name: term_gap_valueset term_gap_valueset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.term_gap_valueset
    ADD CONSTRAINT term_gap_valueset_pkey PRIMARY KEY ("gapId");

--
-- Name: term_icd10 term_icd10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.term_icd10
    ADD CONSTRAINT term_icd10_pkey PRIMARY KEY (code);

--
-- Name: term_loinc term_loinc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.term_loinc
    ADD CONSTRAINT term_loinc_pkey PRIMARY KEY ("loincNum");

--
-- Name: term_msdrg term_msdrg_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.term_msdrg
    ADD CONSTRAINT term_msdrg_pkey PRIMARY KEY ("drgCode");

--
-- Name: term_rxnorm term_rxnorm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.term_rxnorm
    ADD CONSTRAINT term_rxnorm_pkey PRIMARY KEY (rxcui);

--
-- Name: therapy_gaps therapy_gaps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.therapy_gaps
    ADD CONSTRAINT therapy_gaps_pkey PRIMARY KEY (id);

--
-- Name: upload_jobs upload_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_jobs
    ADD CONSTRAINT upload_jobs_pkey PRIMARY KEY (id);

--
-- Name: user_activities user_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activities
    ADD CONSTRAINT user_activities_pkey PRIMARY KEY (id);

--
-- Name: user_mfa user_mfa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_mfa
    ADD CONSTRAINT user_mfa_pkey PRIMARY KEY (id);

--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

--
-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);

--
-- Name: alerts_hospitalId_moduleType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "alerts_hospitalId_moduleType_idx" ON public.alerts USING btree ("hospitalId", "moduleType");

--
-- Name: alerts_hospitalId_severity_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "alerts_hospitalId_severity_createdAt_idx" ON public.alerts USING btree ("hospitalId", severity, "createdAt");

--
-- Name: alerts_hospitalId_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "alerts_hospitalId_severity_idx" ON public.alerts USING btree ("hospitalId", severity);

--
-- Name: alerts_patientId_moduleType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "alerts_patientId_moduleType_idx" ON public.alerts USING btree ("patientId", "moduleType");

--
-- Name: allergy_intolerances_hospitalId_fhirAllergyId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "allergy_intolerances_hospitalId_fhirAllergyId_key" ON public.allergy_intolerances USING btree ("hospitalId", "fhirAllergyId");

--
-- Name: allergy_intolerances_hospitalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "allergy_intolerances_hospitalId_idx" ON public.allergy_intolerances USING btree ("hospitalId");

--
-- Name: allergy_intolerances_patientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "allergy_intolerances_patientId_idx" ON public.allergy_intolerances USING btree ("patientId");

--
-- Name: allergy_intolerances_substanceCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "allergy_intolerances_substanceCode_idx" ON public.allergy_intolerances USING btree ("substanceCode");

--
-- Name: audit_logs_action_resourceType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_action_resourceType_idx" ON public.audit_logs USING btree (action, "resourceType");

--
-- Name: audit_logs_hospitalId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_hospitalId_timestamp_idx" ON public.audit_logs USING btree ("hospitalId", "timestamp");

--
-- Name: audit_logs_patientId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_patientId_timestamp_idx" ON public.audit_logs USING btree ("patientId", "timestamp");

--
-- Name: audit_logs_userId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_userId_timestamp_idx" ON public.audit_logs USING btree ("userId", "timestamp");

--
-- Name: bpci_episodes_hospitalId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bpci_episodes_hospitalId_status_idx" ON public.bpci_episodes USING btree ("hospitalId", status);

--
-- Name: bpci_episodes_patientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bpci_episodes_patientId_idx" ON public.bpci_episodes USING btree ("patientId");

--
-- Name: breach_incidents_discoveredAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "breach_incidents_discoveredAt_idx" ON public.breach_incidents USING btree ("discoveredAt");

--
-- Name: breach_incidents_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX breach_incidents_severity_idx ON public.breach_incidents USING btree (severity);

--
-- Name: breach_incidents_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX breach_incidents_status_idx ON public.breach_incidents USING btree (status);

--
-- Name: business_metrics_hospitalId_category_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_metrics_hospitalId_category_period_idx" ON public.business_metrics USING btree ("hospitalId", category, period);

--
-- Name: business_metrics_hospitalId_metricName_period_periodStart_d_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "business_metrics_hospitalId_metricName_period_periodStart_d_key" ON public.business_metrics USING btree ("hospitalId", "metricName", period, "periodStart", "dimension1Value", "dimension2Value");

--
-- Name: business_metrics_metricName_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_metrics_metricName_period_idx" ON public.business_metrics USING btree ("metricName", period);

--
-- Name: care_plans_hospitalId_moduleType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "care_plans_hospitalId_moduleType_idx" ON public.care_plans USING btree ("hospitalId", "moduleType");

--
-- Name: care_plans_patientId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "care_plans_patientId_status_idx" ON public.care_plans USING btree ("patientId", status);

--
-- Name: cds_hooks_sessions_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cds_hooks_sessions_createdAt_idx" ON public.cds_hooks_sessions USING btree ("createdAt");

--
-- Name: cds_hooks_sessions_hospitalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cds_hooks_sessions_hospitalId_idx" ON public.cds_hooks_sessions USING btree ("hospitalId");

--
-- Name: cds_hooks_sessions_patientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cds_hooks_sessions_patientId_idx" ON public.cds_hooks_sessions USING btree ("patientId");

--
-- Name: conditions_hospitalId_fhirConditionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "conditions_hospitalId_fhirConditionId_key" ON public.conditions USING btree ("hospitalId", "fhirConditionId");

--
-- Name: conditions_hospitalId_icd10Code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "conditions_hospitalId_icd10Code_idx" ON public.conditions USING btree ("hospitalId", "icd10Code");

--
-- Name: conditions_icd10Code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "conditions_icd10Code_idx" ON public.conditions USING btree ("icd10Code");

--
-- Name: conditions_patientId_clinicalStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "conditions_patientId_clinicalStatus_idx" ON public.conditions USING btree ("patientId", "clinicalStatus");

--
-- Name: contraindication_assessments_hospitalId_assessedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "contraindication_assessments_hospitalId_assessedAt_idx" ON public.contraindication_assessments USING btree ("hospitalId", "assessedAt");

--
-- Name: contraindication_assessments_patientId_module_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "contraindication_assessments_patientId_module_idx" ON public.contraindication_assessments USING btree ("patientId", module);

--
-- Name: contraindication_assessments_therapyName_level_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "contraindication_assessments_therapyName_level_idx" ON public.contraindication_assessments USING btree ("therapyName", level);

--
-- Name: cql_results_patientId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cql_results_patientId_createdAt_idx" ON public.cql_results USING btree ("patientId", "createdAt");

--
-- Name: cql_results_ruleId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cql_results_ruleId_createdAt_idx" ON public.cql_results USING btree ("ruleId", "createdAt");

--
-- Name: cql_rules_name_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cql_rules_name_version_key ON public.cql_rules USING btree (name, version);

--
-- Name: cross_referrals_fromModule_toModule_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cross_referrals_fromModule_toModule_idx" ON public.cross_referrals USING btree ("fromModule", "toModule");

--
-- Name: cross_referrals_patientId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cross_referrals_patientId_status_idx" ON public.cross_referrals USING btree ("patientId", status);

--
-- Name: device_eligibility_evaluatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "device_eligibility_evaluatedAt_idx" ON public.device_eligibility USING btree ("evaluatedAt");

--
-- Name: device_eligibility_patientId_deviceType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "device_eligibility_patientId_deviceType_idx" ON public.device_eligibility USING btree ("patientId", "deviceType");

--
-- Name: device_implants_deviceType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "device_implants_deviceType_idx" ON public.device_implants USING btree ("deviceType");

--
-- Name: device_implants_hospitalId_fhirDeviceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "device_implants_hospitalId_fhirDeviceId_key" ON public.device_implants USING btree ("hospitalId", "fhirDeviceId");

--
-- Name: device_implants_hospitalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "device_implants_hospitalId_idx" ON public.device_implants USING btree ("hospitalId");

--
-- Name: device_implants_patientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "device_implants_patientId_idx" ON public.device_implants USING btree ("patientId");

--
-- Name: drug_interaction_alerts_hospitalId_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "drug_interaction_alerts_hospitalId_severity_idx" ON public.drug_interaction_alerts USING btree ("hospitalId", severity);

--
-- Name: drug_interaction_alerts_patientId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "drug_interaction_alerts_patientId_status_idx" ON public.drug_interaction_alerts USING btree ("patientId", status);

--
-- Name: drug_titrations_nextStepDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "drug_titrations_nextStepDate_idx" ON public.drug_titrations USING btree ("nextStepDate");

--
-- Name: drug_titrations_patientId_drugClass_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "drug_titrations_patientId_drugClass_idx" ON public.drug_titrations USING btree ("patientId", "drugClass");

--
-- Name: encounters_hospitalId_fhirEncounterId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "encounters_hospitalId_fhirEncounterId_key" ON public.encounters USING btree ("hospitalId", "fhirEncounterId");

--
-- Name: encounters_hospitalId_startDateTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "encounters_hospitalId_startDateTime_idx" ON public.encounters USING btree ("hospitalId", "startDateTime");

--
-- Name: encounters_patientId_startDateTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "encounters_patientId_startDateTime_idx" ON public.encounters USING btree ("patientId", "startDateTime");

--
-- Name: error_logs_errorHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "error_logs_errorHash_idx" ON public.error_logs USING btree ("errorHash");

--
-- Name: error_logs_errorType_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "error_logs_errorType_timestamp_idx" ON public.error_logs USING btree ("errorType", "timestamp");

--
-- Name: error_logs_hospitalId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "error_logs_hospitalId_timestamp_idx" ON public.error_logs USING btree ("hospitalId", "timestamp");

--
-- Name: error_logs_severity_isResolved_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "error_logs_severity_isResolved_idx" ON public.error_logs USING btree (severity, "isResolved");

--
-- Name: failed_fhir_bundles_failedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "failed_fhir_bundles_failedAt_idx" ON public.failed_fhir_bundles USING btree ("failedAt");

--
-- Name: failed_fhir_bundles_resolvedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "failed_fhir_bundles_resolvedAt_idx" ON public.failed_fhir_bundles USING btree ("resolvedAt");

--
-- Name: feature_usage_featureName_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "feature_usage_featureName_period_idx" ON public.feature_usage USING btree ("featureName", period);

--
-- Name: feature_usage_hospitalId_period_periodStart_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "feature_usage_hospitalId_period_periodStart_idx" ON public.feature_usage USING btree ("hospitalId", period, "periodStart");

--
-- Name: feature_usage_hospitalId_userId_featureName_period_periodSt_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "feature_usage_hospitalId_userId_featureName_period_periodSt_key" ON public.feature_usage USING btree ("hospitalId", "userId", "featureName", period, "periodStart");

--
-- Name: hospitals_npi_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX hospitals_npi_key ON public.hospitals USING btree (npi);

--
-- Name: hospitals_redoxDestinationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hospitals_redoxDestinationId_key" ON public.hospitals USING btree ("redoxDestinationId");

--
-- Name: hospitals_redoxSourceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hospitals_redoxSourceId_key" ON public.hospitals USING btree ("redoxSourceId");

--
-- Name: internal_notes_hospitalId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "internal_notes_hospitalId_createdAt_idx" ON public.internal_notes USING btree ("hospitalId", "createdAt");

--
-- Name: internal_notes_noteType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "internal_notes_noteType_idx" ON public.internal_notes USING btree ("noteType");

--
-- Name: intervention_tracking_hospitalId_performedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "intervention_tracking_hospitalId_performedAt_idx" ON public.intervention_tracking USING btree ("hospitalId", "performedAt");

--
-- Name: intervention_tracking_module_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX intervention_tracking_module_category_idx ON public.intervention_tracking USING btree (module, category);

--
-- Name: intervention_tracking_patientId_module_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "intervention_tracking_patientId_module_idx" ON public.intervention_tracking USING btree ("patientId", module);

--
-- Name: intervention_tracking_status_module_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX intervention_tracking_status_module_idx ON public.intervention_tracking USING btree (status, module);

--
-- Name: invite_tokens_hospitalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invite_tokens_hospitalId_idx" ON public.invite_tokens USING btree ("hospitalId");

--
-- Name: invite_tokens_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invite_tokens_token_idx ON public.invite_tokens USING btree (token);

--
-- Name: invite_tokens_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invite_tokens_token_key ON public.invite_tokens USING btree (token);

--
-- Name: ip_allowlist_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ip_allowlist_userId_idx" ON public.ip_allowlist USING btree ("userId");

--
-- Name: login_sessions_sessionToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "login_sessions_sessionToken_key" ON public.login_sessions USING btree ("sessionToken");

--
-- Name: medications_hospitalId_fhirMedicationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "medications_hospitalId_fhirMedicationId_key" ON public.medications USING btree ("hospitalId", "fhirMedicationId");

--
-- Name: medications_hospitalId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "medications_hospitalId_status_idx" ON public.medications USING btree ("hospitalId", status);

--
-- Name: medications_patientId_drugClass_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "medications_patientId_drugClass_idx" ON public.medications USING btree ("patientId", "drugClass");

--
-- Name: medications_rxNormCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "medications_rxNormCode_idx" ON public.medications USING btree ("rxNormCode");

--
-- Name: observations_hospitalId_fhirObservationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "observations_hospitalId_fhirObservationId_key" ON public.observations USING btree ("hospitalId", "fhirObservationId");

--
-- Name: observations_hospitalId_observedDateTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "observations_hospitalId_observedDateTime_idx" ON public.observations USING btree ("hospitalId", "observedDateTime");

--
-- Name: observations_observationType_observedDateTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "observations_observationType_observedDateTime_idx" ON public.observations USING btree ("observationType", "observedDateTime");

--
-- Name: observations_patientId_observationType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "observations_patientId_observationType_idx" ON public.observations USING btree ("patientId", "observationType");

--
-- Name: onboarding_hospitalId_stepName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "onboarding_hospitalId_stepName_idx" ON public.onboarding USING btree ("hospitalId", "stepName");

--
-- Name: onboarding_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX onboarding_status_idx ON public.onboarding USING btree (status);

--
-- Name: orders_fhirOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "orders_fhirOrderId_idx" ON public.orders USING btree ("fhirOrderId");

--
-- Name: orders_hospitalId_orderedDateTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "orders_hospitalId_orderedDateTime_idx" ON public.orders USING btree ("hospitalId", "orderedDateTime");

--
-- Name: orders_patientId_orderType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "orders_patientId_orderType_idx" ON public.orders USING btree ("patientId", "orderType");

--
-- Name: patient_data_requests_dueDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "patient_data_requests_dueDate_idx" ON public.patient_data_requests USING btree ("dueDate");

--
-- Name: patient_data_requests_hospitalId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "patient_data_requests_hospitalId_status_idx" ON public.patient_data_requests USING btree ("hospitalId", status);

--
-- Name: patient_data_requests_patientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "patient_data_requests_patientId_idx" ON public.patient_data_requests USING btree ("patientId");

--
-- Name: patients_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patients_email_idx ON public.patients USING btree (email);

--
-- Name: patients_fhirPatientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "patients_fhirPatientId_idx" ON public.patients USING btree ("fhirPatientId");

--
-- Name: patients_hospitalId_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "patients_hospitalId_isActive_idx" ON public.patients USING btree ("hospitalId", "isActive");

--
-- Name: patients_hospitalId_mrn_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "patients_hospitalId_mrn_key" ON public.patients USING btree ("hospitalId", mrn);

--
-- Name: patients_lastName_firstName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "patients_lastName_firstName_idx" ON public.patients USING btree ("lastName", "firstName");

--
-- Name: performance_metrics_hospitalId_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "performance_metrics_hospitalId_period_idx" ON public.performance_metrics USING btree ("hospitalId", period);

--
-- Name: performance_metrics_metricType_period_periodStart_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "performance_metrics_metricType_period_periodStart_idx" ON public.performance_metrics USING btree ("metricType", period, "periodStart");

--
-- Name: phenotypes_patientId_phenotypeName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "phenotypes_patientId_phenotypeName_idx" ON public.phenotypes USING btree ("patientId", "phenotypeName");

--
-- Name: phenotypes_phenotypeName_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "phenotypes_phenotypeName_status_idx" ON public.phenotypes USING btree ("phenotypeName", status);

--
-- Name: procedures_cptCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "procedures_cptCode_idx" ON public.procedures USING btree ("cptCode");

--
-- Name: procedures_hospitalId_fhirProcedureId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "procedures_hospitalId_fhirProcedureId_key" ON public.procedures USING btree ("hospitalId", "fhirProcedureId");

--
-- Name: procedures_hospitalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "procedures_hospitalId_idx" ON public.procedures USING btree ("hospitalId");

--
-- Name: procedures_patientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "procedures_patientId_idx" ON public.procedures USING btree ("patientId");

--
-- Name: quality_measures_hospitalId_measureCode_reportingPeriod_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "quality_measures_hospitalId_measureCode_reportingPeriod_key" ON public.quality_measures USING btree ("hospitalId", "measureCode", "reportingPeriod");

--
-- Name: quality_measures_measureCode_periodStart_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quality_measures_measureCode_periodStart_idx" ON public.quality_measures USING btree ("measureCode", "periodStart");

--
-- Name: recommendations_hospitalId_moduleType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "recommendations_hospitalId_moduleType_idx" ON public.recommendations USING btree ("hospitalId", "moduleType");

--
-- Name: recommendations_hospitalId_patientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "recommendations_hospitalId_patientId_idx" ON public.recommendations USING btree ("hospitalId", "patientId");

--
-- Name: report_generations_hospitalId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "report_generations_hospitalId_createdAt_idx" ON public.report_generations USING btree ("hospitalId", "createdAt");

--
-- Name: report_generations_reportType_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "report_generations_reportType_createdAt_idx" ON public.report_generations USING btree ("reportType", "createdAt");

--
-- Name: report_generations_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "report_generations_userId_createdAt_idx" ON public.report_generations USING btree ("userId", "createdAt");

--
-- Name: risk_score_assessments_hospitalId_calculatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "risk_score_assessments_hospitalId_calculatedAt_idx" ON public.risk_score_assessments USING btree ("hospitalId", "calculatedAt");

--
-- Name: risk_score_assessments_patientId_scoreType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "risk_score_assessments_patientId_scoreType_idx" ON public.risk_score_assessments USING btree ("patientId", "scoreType");

--
-- Name: risk_score_assessments_scoreType_module_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "risk_score_assessments_scoreType_module_idx" ON public.risk_score_assessments USING btree ("scoreType", module);

--
-- Name: therapy_gaps_hospitalId_module_resolvedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "therapy_gaps_hospitalId_module_resolvedAt_idx" ON public.therapy_gaps USING btree ("hospitalId", module, "resolvedAt");

--
-- Name: therapy_gaps_hospitalId_patientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "therapy_gaps_hospitalId_patientId_idx" ON public.therapy_gaps USING btree ("hospitalId", "patientId");

--
-- Name: therapy_gaps_module_gapType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "therapy_gaps_module_gapType_idx" ON public.therapy_gaps USING btree (module, "gapType");

--
-- Name: therapy_gaps_patientId_identifiedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "therapy_gaps_patientId_identifiedAt_idx" ON public.therapy_gaps USING btree ("patientId", "identifiedAt");

--
-- Name: upload_jobs_hospitalId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "upload_jobs_hospitalId_createdAt_idx" ON public.upload_jobs USING btree ("hospitalId", "createdAt");

--
-- Name: upload_jobs_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX upload_jobs_status_idx ON public.upload_jobs USING btree (status);

--
-- Name: user_activities_activityType_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_activities_activityType_timestamp_idx" ON public.user_activities USING btree ("activityType", "timestamp");

--
-- Name: user_activities_hospitalId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_activities_hospitalId_timestamp_idx" ON public.user_activities USING btree ("hospitalId", "timestamp");

--
-- Name: user_activities_sessionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_activities_sessionId_idx" ON public.user_activities USING btree ("sessionId");

--
-- Name: user_activities_userId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_activities_userId_timestamp_idx" ON public.user_activities USING btree ("userId", "timestamp");

--
-- Name: user_mfa_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_mfa_userId_key" ON public.user_mfa USING btree ("userId");

--
-- Name: user_sessions_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_sessions_expiresAt_idx" ON public.user_sessions USING btree ("expiresAt");

--
-- Name: user_sessions_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_sessions_tokenHash_key" ON public.user_sessions USING btree ("tokenHash");

--
-- Name: user_sessions_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_sessions_userId_idx" ON public.user_sessions USING btree ("userId");

--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

--
-- Name: users_resetToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "users_resetToken_key" ON public.users USING btree ("resetToken");

--
-- Name: webhook_events_eventId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "webhook_events_eventId_key" ON public.webhook_events USING btree ("eventId");

--
-- Name: webhook_events_hospitalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "webhook_events_hospitalId_idx" ON public.webhook_events USING btree ("hospitalId");

--
-- Name: webhook_events_patientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "webhook_events_patientId_idx" ON public.webhook_events USING btree ("patientId");

--
-- Name: webhook_events_receivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "webhook_events_receivedAt_idx" ON public.webhook_events USING btree ("receivedAt");

--
-- Name: webhook_events_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webhook_events_status_idx ON public.webhook_events USING btree (status);

--
-- Name: alerts alerts_assignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT "alerts_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: alerts alerts_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT "alerts_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: alerts alerts_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT "alerts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: allergy_intolerances allergy_intolerances_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allergy_intolerances
    ADD CONSTRAINT "allergy_intolerances_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: allergy_intolerances allergy_intolerances_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allergy_intolerances
    ADD CONSTRAINT "allergy_intolerances_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: audit_logs audit_logs_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: bpci_episodes bpci_episodes_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bpci_episodes
    ADD CONSTRAINT "bpci_episodes_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: bpci_episodes bpci_episodes_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bpci_episodes
    ADD CONSTRAINT "bpci_episodes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: business_metrics business_metrics_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_metrics
    ADD CONSTRAINT "business_metrics_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: care_plans care_plans_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_plans
    ADD CONSTRAINT "care_plans_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: care_plans care_plans_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_plans
    ADD CONSTRAINT "care_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: cds_hooks_sessions cds_hooks_sessions_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cds_hooks_sessions
    ADD CONSTRAINT "cds_hooks_sessions_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: conditions conditions_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conditions
    ADD CONSTRAINT "conditions_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: conditions conditions_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conditions
    ADD CONSTRAINT "conditions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: contraindication_assessments contraindication_assessments_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contraindication_assessments
    ADD CONSTRAINT "contraindication_assessments_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: contraindication_assessments contraindication_assessments_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contraindication_assessments
    ADD CONSTRAINT "contraindication_assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: cql_results cql_results_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cql_results
    ADD CONSTRAINT "cql_results_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: cql_results cql_results_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cql_results
    ADD CONSTRAINT "cql_results_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: cql_results cql_results_ruleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cql_results
    ADD CONSTRAINT "cql_results_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES public.cql_rules(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: cross_referrals cross_referrals_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_referrals
    ADD CONSTRAINT "cross_referrals_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: cross_referrals cross_referrals_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_referrals
    ADD CONSTRAINT "cross_referrals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: device_eligibility device_eligibility_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_eligibility
    ADD CONSTRAINT "device_eligibility_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: device_eligibility device_eligibility_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_eligibility
    ADD CONSTRAINT "device_eligibility_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: device_implants device_implants_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_implants
    ADD CONSTRAINT "device_implants_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: device_implants device_implants_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_implants
    ADD CONSTRAINT "device_implants_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: drug_interaction_alerts drug_interaction_alerts_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drug_interaction_alerts
    ADD CONSTRAINT "drug_interaction_alerts_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: drug_interaction_alerts drug_interaction_alerts_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drug_interaction_alerts
    ADD CONSTRAINT "drug_interaction_alerts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: drug_titrations drug_titrations_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drug_titrations
    ADD CONSTRAINT "drug_titrations_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: drug_titrations drug_titrations_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drug_titrations
    ADD CONSTRAINT "drug_titrations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: encounters encounters_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT "encounters_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: encounters encounters_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT "encounters_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: error_logs error_logs_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT "error_logs_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: error_logs error_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT "error_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: feature_usage feature_usage_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_usage
    ADD CONSTRAINT "feature_usage_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: feature_usage feature_usage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_usage
    ADD CONSTRAINT "feature_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: internal_notes internal_notes_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_notes
    ADD CONSTRAINT "internal_notes_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: intervention_tracking intervention_tracking_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervention_tracking
    ADD CONSTRAINT "intervention_tracking_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: intervention_tracking intervention_tracking_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervention_tracking
    ADD CONSTRAINT "intervention_tracking_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: invite_tokens invite_tokens_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_tokens
    ADD CONSTRAINT "invite_tokens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: invite_tokens invite_tokens_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_tokens
    ADD CONSTRAINT "invite_tokens_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: ip_allowlist ip_allowlist_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_allowlist
    ADD CONSTRAINT "ip_allowlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: login_sessions login_sessions_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_sessions
    ADD CONSTRAINT "login_sessions_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: login_sessions login_sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_sessions
    ADD CONSTRAINT "login_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: medications medications_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT "medications_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: medications medications_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT "medications_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: observations observations_encounterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT "observations_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES public.encounters(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: observations observations_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT "observations_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: observations observations_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT "observations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: onboarding onboarding_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding
    ADD CONSTRAINT "onboarding_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: orders orders_encounterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES public.encounters(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: orders orders_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: orders orders_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: patients patients_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT "patients_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: patients patients_mergedIntoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT "patients_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: performance_metrics performance_metrics_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_metrics
    ADD CONSTRAINT "performance_metrics_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: phenotypes phenotypes_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phenotypes
    ADD CONSTRAINT "phenotypes_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: phenotypes phenotypes_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phenotypes
    ADD CONSTRAINT "phenotypes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: procedures procedures_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT "procedures_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: procedures procedures_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT "procedures_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: quality_measures quality_measures_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_measures
    ADD CONSTRAINT "quality_measures_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: recommendations recommendations_assignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT "recommendations_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: recommendations recommendations_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT "recommendations_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: recommendations recommendations_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT "recommendations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: report_generations report_generations_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_generations
    ADD CONSTRAINT "report_generations_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: report_generations report_generations_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_generations
    ADD CONSTRAINT "report_generations_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: risk_score_assessments risk_score_assessments_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_score_assessments
    ADD CONSTRAINT "risk_score_assessments_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: risk_score_assessments risk_score_assessments_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_score_assessments
    ADD CONSTRAINT "risk_score_assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: therapy_gaps therapy_gaps_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.therapy_gaps
    ADD CONSTRAINT "therapy_gaps_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: therapy_gaps therapy_gaps_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.therapy_gaps
    ADD CONSTRAINT "therapy_gaps_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: upload_jobs upload_jobs_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_jobs
    ADD CONSTRAINT "upload_jobs_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: upload_jobs upload_jobs_uploadedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_jobs
    ADD CONSTRAINT "upload_jobs_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: user_activities user_activities_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activities
    ADD CONSTRAINT "user_activities_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: user_activities user_activities_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activities
    ADD CONSTRAINT "user_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: user_mfa user_mfa_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_mfa
    ADD CONSTRAINT "user_mfa_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: user_sessions user_sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: users users_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: webhook_events webhook_events_hospitalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT "webhook_events_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES public.hospitals(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: webhook_events webhook_events_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT "webhook_events_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
--

