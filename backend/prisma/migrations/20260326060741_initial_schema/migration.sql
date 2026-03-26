-- CreateEnum
CREATE TYPE "HospitalType" AS ENUM ('COMMUNITY', 'ACADEMIC', 'SPECIALTY', 'CRITICAL_ACCESS', 'FEDERAL');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('BASIC', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHYSICIAN', 'NURSE_MANAGER', 'QUALITY_DIRECTOR', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EncounterType" AS ENUM ('INPATIENT', 'OUTPATIENT', 'EMERGENCY', 'OBSERVATION', 'DAY_SURGERY', 'TELEHEALTH');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('PLANNED', 'ARRIVED', 'TRIAGED', 'IN_PROGRESS', 'ON_LEAVE', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ObservationCategory" AS ENUM ('VITAL_SIGNS', 'LABORATORY', 'IMAGING', 'PROCEDURE', 'SURVEY', 'EXAM', 'THERAPY');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('LABORATORY', 'IMAGING', 'PROCEDURE', 'MEDICATION', 'CONSULT', 'THERAPY', 'DIET', 'NURSING');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'REVOKED', 'COMPLETED', 'ENTERED_IN_ERROR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OrderPriority" AS ENUM ('ROUTINE', 'URGENT', 'ASAP', 'STAT');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('CLINICAL', 'ADMINISTRATIVE', 'TECHNICAL', 'SAFETY');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('MEDICATION', 'PROCEDURE', 'FOLLOWUP', 'LIFESTYLE', 'MONITORING', 'REFERRAL');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('HEART_FAILURE', 'ELECTROPHYSIOLOGY', 'STRUCTURAL_HEART', 'CORONARY_INTERVENTION', 'PERIPHERAL_VASCULAR', 'VALVULAR_DISEASE');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('LOGIN', 'LOGOUT', 'PAGE_VIEW', 'API_REQUEST', 'SEARCH', 'FILTER', 'EXPORT', 'CREATE', 'UPDATE', 'DELETE', 'DOWNLOAD', 'PRINT', 'SHARE');

-- CreateEnum
CREATE TYPE "FeatureCategory" AS ENUM ('DASHBOARD', 'PATIENT_MANAGEMENT', 'CLINICAL_DECISION_SUPPORT', 'REPORTING', 'ANALYTICS', 'ADMINISTRATION', 'COMMUNICATION', 'DATA_EXPORT', 'ALERTS', 'WORKFLOWS');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('API_PERFORMANCE', 'DATABASE_PERFORMANCE', 'UI_PERFORMANCE', 'SYSTEM_HEALTH', 'NETWORK_LATENCY', 'ERROR_TRACKING', 'RESOURCE_UTILIZATION');

-- CreateEnum
CREATE TYPE "BusinessCategory" AS ENUM ('USER_ENGAGEMENT', 'CLINICAL_OUTCOMES', 'OPERATIONAL_EFFICIENCY', 'QUALITY_METRICS', 'UTILIZATION', 'ADOPTION', 'SATISFACTION', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ErrorSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TherapyGapType" AS ENUM ('MEDICATION_MISSING', 'MEDICATION_UNDERDOSED', 'MEDICATION_CONTRAINDICATED', 'DEVICE_ELIGIBLE', 'DEVICE_UPGRADE_DUE', 'MONITORING_OVERDUE', 'FOLLOWUP_OVERDUE');

-- CreateEnum
CREATE TYPE "PhenotypeType" AS ENUM ('CARDIAC_AMYLOIDOSIS', 'CARDIAC_SARCOIDOSIS', 'HCM', 'ARVC', 'LVNC', 'FABRY_DISEASE', 'IRON_DEFICIENCY_HF', 'PERIPARTUM_CARDIOMYOPATHY', 'CHEMOTHERAPY_CARDIOMYOPATHY', 'CHAGAS_CARDIOMYOPATHY', 'TACHYCARDIA_CARDIOMYOPATHY', 'AUTOIMMUNE_MYOCARDITIS', 'CMD', 'SCAD', 'CORONARY_ECTASIA', 'VASOSPASTIC_ANGINA', 'IN_STENT_RESTENOSIS', 'THROMBOTIC_CAD', 'CALCIFIC_CAD', 'LEFT_MAIN_DISEASE', 'MYOCARDIAL_BRIDGING', 'CORONARY_FISTULA', 'LFLG_AORTIC_STENOSIS', 'BPV_DEGENERATION', 'INFECTIVE_ENDOCARDITIS', 'RHEUMATIC_VALVE', 'MARFAN_VALVE', 'PARAVALVULAR_LEAK', 'RADIATION_VALVE', 'CARCINOID_VALVE', 'CLTI', 'DIABETIC_FOOT', 'BLUE_TOE_SYNDROME', 'POPLITEAL_ENTRAPMENT', 'FMD', 'BUERGER_DISEASE', 'ADVENTITIAL_CYSTIC', 'MALS');

-- CreateEnum
CREATE TYPE "PhenotypeStatus" AS ENUM ('DETECTED', 'SUSPECTED', 'RULED_OUT', 'CONFIRMED', 'MONITORING');

-- CreateEnum
CREATE TYPE "ReferralUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('TRIGGERED', 'REVIEWED', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "HFPillarType" AS ENUM ('ACE_ARB_ARNI', 'BETA_BLOCKER', 'MRA', 'SGLT2_INHIBITOR');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('ICD', 'CRT_P', 'CRT_D', 'PACEMAKER', 'WATCHMAN', 'MITRACLIP', 'LVAD', 'HEART_MATE', 'DES', 'BMS', 'IVUS_CATHETER', 'OCT_CATHETER', 'FFR_WIRE', 'IVL_CATHETER', 'IMPELLA', 'ROTABLATOR', 'TAVR_VALVE', 'SAVR_PROSTHESIS', 'TEER_DEVICE', 'TMVR_DEVICE', 'PERIPHERAL_STENT', 'DCB', 'ATHERECTOMY_DEVICE', 'BYPASS_GRAFT');

-- CreateEnum
CREATE TYPE "DrugClassType" AS ENUM ('ANTIPLATELET', 'P2Y12_INHIBITOR', 'ANTICOAGULANT_CORONARY', 'STATIN', 'NITRATE', 'CCB_ANTIANGINAL', 'RANOLAZINE', 'ANTICOAGULANT_VALVE', 'ANTIHYPERTENSIVE_VALVE', 'DIURETIC_VALVE', 'CILOSTAZOL', 'ANTIPLATELET_PAD', 'STATIN_PAD', 'PENTOXIFYLLINE', 'PROSTANOID', 'ACE_ARB_ARNI_GENERAL', 'BETA_BLOCKER_GENERAL', 'MRA_GENERAL', 'SGLT2I_GENERAL');

-- CreateEnum
CREATE TYPE "RiskScoreType" AS ENUM ('MAGGIC', 'SHFM', 'CHA2DS2_VASC', 'HAS_BLED', 'STS_SCORE', 'EUROSCORE_II', 'GRACE', 'SYNTAX', 'TIMI', 'HEART_SCORE', 'DUKE_JEOPARDY', 'ABI_ASSESSMENT', 'FONTAINE', 'RUTHERFORD', 'WIFI', 'STS_PROM', 'EUROSCORE_LOG', 'GDMT_OPTIMIZATION');

-- CreateEnum
CREATE TYPE "InterventionCategory" AS ENUM ('PERCUTANEOUS', 'SURGICAL', 'DIAGNOSTIC', 'IMAGING', 'THERAPEUTIC', 'PHARMACOLOGIC', 'DEVICE_IMPLANT', 'MONITORING');

-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('ELIGIBLE', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DEFERRED', 'CONTRAINDICATED');

-- CreateEnum
CREATE TYPE "ContraindicationLevel" AS ENUM ('SAFE', 'MONITOR', 'CAUTION', 'RELATIVE', 'ABSOLUTE');

-- CreateEnum
CREATE TYPE "MedicationStatus" AS ENUM ('ACTIVE', 'DISCONTINUED', 'ON_HOLD', 'COMPLETED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "ConditionCategory" AS ENUM ('PROBLEM_LIST', 'ENCOUNTER_DIAGNOSIS', 'HEALTH_CONCERN');

-- CreateEnum
CREATE TYPE "ConditionClinicalStatus" AS ENUM ('ACTIVE', 'RECURRENCE', 'RELAPSE', 'INACTIVE', 'REMISSION', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ConditionVerificationStatus" AS ENUM ('UNCONFIRMED', 'PROVISIONAL', 'DIFFERENTIAL', 'CONFIRMED', 'REFUTED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "CarePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'REVOKED', 'COMPLETED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'TERMINATED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "BreachType" AS ENUM ('UNAUTHORIZED_ACCESS', 'UNAUTHORIZED_DISCLOSURE', 'LOSS_OF_DATA', 'THEFT_OF_DATA', 'IMPROPER_DISPOSAL', 'HACKING_IT_INCIDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "BreachSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BreachStatus" AS ENUM ('DISCOVERED', 'INVESTIGATING', 'CONTAINED', 'RISK_ASSESSED', 'HHS_NOTIFIED', 'INDIVIDUALS_NOTIFIED', 'REMEDIATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DataRequestType" AS ENUM ('ACCESS', 'DELETION', 'AMENDMENT', 'RESTRICTION', 'ACCOUNTING');

-- CreateEnum
CREATE TYPE "DataRequestStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'DENIED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "UploadJobStatus" AS ENUM ('PENDING', 'VALIDATING', 'PROCESSING', 'DETECTING_GAPS', 'COMPLETE', 'FAILED', 'REJECTED_PHI');

-- CreateTable
CREATE TABLE "hospitals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "system" TEXT,
    "npi" TEXT,
    "patientCount" INTEGER NOT NULL,
    "bedCount" INTEGER NOT NULL,
    "hospitalType" "HospitalType" NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "redoxSourceId" TEXT,
    "redoxDestinationId" TEXT,
    "redoxWebhookUrl" TEXT,
    "redoxIsActive" BOOLEAN NOT NULL DEFAULT true,
    "moduleHeartFailure" BOOLEAN NOT NULL DEFAULT false,
    "moduleElectrophysiology" BOOLEAN NOT NULL DEFAULT false,
    "moduleStructuralHeart" BOOLEAN NOT NULL DEFAULT false,
    "moduleCoronaryIntervention" BOOLEAN NOT NULL DEFAULT false,
    "modulePeripheralVascular" BOOLEAN NOT NULL DEFAULT false,
    "moduleValvularDisease" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionTier" "SubscriptionTier" NOT NULL,
    "subscriptionStart" TIMESTAMP(3) NOT NULL,
    "subscriptionEnd" TIMESTAMP(3),
    "subscriptionActive" BOOLEAN NOT NULL DEFAULT true,
    "maxUsers" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "title" TEXT,
    "department" TEXT,
    "npi" TEXT,
    "role" "UserRole" NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "permHeartFailure" BOOLEAN NOT NULL DEFAULT false,
    "permElectrophysiology" BOOLEAN NOT NULL DEFAULT false,
    "permStructuralHeart" BOOLEAN NOT NULL DEFAULT false,
    "permCoronaryIntervention" BOOLEAN NOT NULL DEFAULT false,
    "permPeripheralVascular" BOOLEAN NOT NULL DEFAULT false,
    "permValvularDisease" BOOLEAN NOT NULL DEFAULT false,
    "permExecutiveView" BOOLEAN NOT NULL DEFAULT false,
    "permServiceLineView" BOOLEAN NOT NULL DEFAULT false,
    "permCareTeamView" BOOLEAN NOT NULL DEFAULT false,
    "permViewReports" BOOLEAN NOT NULL DEFAULT true,
    "permExportData" BOOLEAN NOT NULL DEFAULT false,
    "permManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "permConfigureAlerts" BOOLEAN NOT NULL DEFAULT false,
    "permAccessPHI" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "riskScore" DOUBLE PRECISION,
    "riskCategory" "RiskCategory",
    "lastAssessment" TIMESTAMP(3),
    "heartFailurePatient" BOOLEAN NOT NULL DEFAULT false,
    "electrophysiologyPatient" BOOLEAN NOT NULL DEFAULT false,
    "structuralHeartPatient" BOOLEAN NOT NULL DEFAULT false,
    "coronaryPatient" BOOLEAN NOT NULL DEFAULT false,
    "peripheralVascularPatient" BOOLEAN NOT NULL DEFAULT false,
    "valvularDiseasePatient" BOOLEAN NOT NULL DEFAULT false,
    "fhirPatientId" TEXT,
    "lastEHRSync" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "encounterNumber" TEXT NOT NULL,
    "encounterType" "EncounterType" NOT NULL,
    "status" "EncounterStatus" NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3),
    "department" TEXT,
    "location" TEXT,
    "attendingProvider" TEXT,
    "chiefComplaint" TEXT,
    "primaryDiagnosis" TEXT,
    "diagnosisCodes" JSONB,
    "fhirEncounterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "hospitalId" TEXT NOT NULL,
    "observationType" TEXT NOT NULL,
    "observationName" TEXT NOT NULL,
    "category" "ObservationCategory" NOT NULL,
    "valueNumeric" DOUBLE PRECISION,
    "valueText" TEXT,
    "valueBoolean" BOOLEAN,
    "unit" TEXT,
    "referenceRangeLow" DOUBLE PRECISION,
    "referenceRangeHigh" DOUBLE PRECISION,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "observedDateTime" TIMESTAMP(3) NOT NULL,
    "resultDateTime" TIMESTAMP(3),
    "orderingProvider" TEXT,
    "performingLab" TEXT,
    "fhirObservationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "hospitalId" TEXT NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "orderCode" TEXT,
    "orderName" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "priority" "OrderPriority" NOT NULL,
    "orderedDateTime" TIMESTAMP(3) NOT NULL,
    "scheduledDateTime" TIMESTAMP(3),
    "completedDateTime" TIMESTAMP(3),
    "orderingProvider" TEXT NOT NULL,
    "performingDepartment" TEXT,
    "indication" TEXT,
    "instructions" TEXT,
    "fhirOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "alertType" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "moduleType" "ModuleType" NOT NULL,
    "actionRequired" BOOLEAN NOT NULL DEFAULT false,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "triggerData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "recommendationType" "RecommendationType" NOT NULL,
    "priority" "RecommendationPriority" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT,
    "moduleType" "ModuleType" NOT NULL,
    "isImplemented" BOOLEAN NOT NULL DEFAULT false,
    "implementedAt" TIMESTAMP(3),
    "implementationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "evidenceLevel" TEXT,
    "guidelineSource" TEXT,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "loginTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "status" "WebhookStatus" NOT NULL,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "rawPayload" JSONB NOT NULL,
    "processedData" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventDateTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "hospitalId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "activityType" "ActivityType" NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "moduleType" "ModuleType",
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "duration" INTEGER,
    "metadata" JSONB,
    "responseTime" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "deviceType" TEXT,
    "browserName" TEXT,
    "osName" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_usage" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "userId" TEXT,
    "featureName" TEXT NOT NULL,
    "moduleType" "ModuleType",
    "category" "FeatureCategory" NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_metrics" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "metricType" "MetricType" NOT NULL,
    "endpoint" TEXT,
    "operation" TEXT NOT NULL,
    "responseTime" DOUBLE PRECISION NOT NULL,
    "throughput" DOUBLE PRECISION,
    "errorRate" DOUBLE PRECISION,
    "p95ResponseTime" DOUBLE PRECISION,
    "p99ResponseTime" DOUBLE PRECISION,
    "requestCount" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "cpuUsage" DOUBLE PRECISION,
    "memoryUsage" DOUBLE PRECISION,
    "dbQueries" INTEGER,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_metrics" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "category" "BusinessCategory" NOT NULL,
    "moduleType" "ModuleType",
    "value" DOUBLE PRECISION NOT NULL,
    "target" DOUBLE PRECISION,
    "previousValue" DOUBLE PRECISION,
    "dimension1" TEXT,
    "dimension1Value" TEXT,
    "dimension2" TEXT,
    "dimension2Value" TEXT,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "unit" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_generations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "reportName" TEXT NOT NULL,
    "moduleType" "ModuleType",
    "dateRange" JSONB,
    "filters" JSONB,
    "parameters" JSONB,
    "generationTime" INTEGER NOT NULL,
    "recordCount" INTEGER,
    "fileSize" INTEGER,
    "exportFormat" TEXT,
    "status" "ReportStatus" NOT NULL,
    "errorMessage" TEXT,
    "fileName" TEXT,
    "filePath" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "report_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "userId" TEXT,
    "errorType" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT NOT NULL,
    "stackTrace" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "requestId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "serverInstance" TEXT,
    "environment" TEXT,
    "version" TEXT,
    "severity" "ErrorSeverity" NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "errorHash" TEXT,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "firstOccurrence" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOccurrence" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cql_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "module" "ModuleType" NOT NULL,
    "category" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastExecuted" TIMESTAMP(3),
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "authoredBy" TEXT,
    "evidenceLevel" TEXT,
    "guidelineSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cql_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cql_results" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "recommendation" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cql_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_gaps" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "gapType" "TherapyGapType" NOT NULL,
    "module" "ModuleType" NOT NULL,
    "medication" TEXT,
    "device" TEXT,
    "currentStatus" TEXT NOT NULL,
    "targetStatus" TEXT NOT NULL,
    "identifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "barriers" JSONB,
    "recommendations" JSONB,

    CONSTRAINT "therapy_gaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phenotypes" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "phenotypeName" "PhenotypeType" NOT NULL,
    "status" "PhenotypeStatus" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "riskScore" DOUBLE PRECISION,
    "riskFactors" JSONB,

    CONSTRAINT "phenotypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_referrals" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "fromModule" "ModuleType" NOT NULL,
    "toModule" "ModuleType" NOT NULL,
    "reason" TEXT NOT NULL,
    "urgency" "ReferralUrgency" NOT NULL,
    "status" "ReferralStatus" NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "acceptedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "triggerData" JSONB,
    "notes" TEXT,

    CONSTRAINT "cross_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_titrations" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "drugClass" "HFPillarType",
    "generalDrugClass" "DrugClassType",
    "module" "ModuleType" NOT NULL DEFAULT 'HEART_FAILURE',
    "drugName" TEXT NOT NULL,
    "currentDose" DOUBLE PRECISION NOT NULL,
    "currentDoseUnit" TEXT NOT NULL,
    "targetDose" DOUBLE PRECISION NOT NULL,
    "targetDoseUnit" TEXT NOT NULL,
    "nextStepDate" TIMESTAMP(3),
    "nextStepDose" DOUBLE PRECISION,
    "titrationStep" INTEGER NOT NULL DEFAULT 1,
    "barriers" JSONB,
    "monitoringPlan" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pausedReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_titrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_measures" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "measureCode" TEXT NOT NULL,
    "measureName" TEXT NOT NULL,
    "measureDescription" TEXT,
    "numerator" INTEGER NOT NULL,
    "denominator" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "reportingPeriod" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "nationalBenchmark" DOUBLE PRECISION,
    "target" DOUBLE PRECISION,
    "previousRate" DOUBLE PRECISION,
    "exclusions" INTEGER,
    "exclusionReasons" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_measures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_eligibility" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "deviceModel" TEXT,
    "eligible" BOOLEAN NOT NULL,
    "eligibilityScore" DOUBLE PRECISION,
    "criteria" JSONB NOT NULL,
    "barriers" JSONB,
    "indication" TEXT,
    "contraindications" JSONB,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluatedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "implanted" BOOLEAN NOT NULL DEFAULT false,
    "implantedAt" TIMESTAMP(3),
    "declinedReason" TEXT,

    CONSTRAINT "device_eligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_score_assessments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "scoreType" "RiskScoreType" NOT NULL,
    "module" "ModuleType" NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "riskCategory" "RiskCategory" NOT NULL,
    "components" JSONB NOT NULL,
    "inputData" JSONB NOT NULL,
    "interpretation" TEXT NOT NULL,
    "recommendation" TEXT,
    "mortality" DOUBLE PRECISION,
    "eventRisk" DOUBLE PRECISION,
    "calculatedBy" TEXT,
    "clinicalContext" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_score_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervention_tracking" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "interventionName" TEXT NOT NULL,
    "category" "InterventionCategory" NOT NULL,
    "module" "ModuleType" NOT NULL,
    "status" "InterventionStatus" NOT NULL,
    "cptCode" TEXT,
    "icd10Code" TEXT,
    "reimbursementCode" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "performedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "performingProvider" TEXT,
    "referringProvider" TEXT,
    "facility" TEXT,
    "indication" TEXT,
    "technique" TEXT,
    "findings" JSONB,
    "complications" JSONB,
    "outcome" TEXT,
    "followUpPlan" TEXT,
    "nextAssessment" TIMESTAMP(3),
    "estimatedReimbursement" DOUBLE PRECISION,
    "actualReimbursement" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intervention_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contraindication_assessments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "module" "ModuleType" NOT NULL,
    "therapyName" TEXT NOT NULL,
    "therapyType" TEXT NOT NULL,
    "level" "ContraindicationLevel" NOT NULL,
    "reasons" JSONB NOT NULL,
    "alternatives" JSONB,
    "monitoring" JSONB,
    "dosing" JSONB,
    "assessedBy" TEXT,
    "overriddenBy" TEXT,
    "overrideReason" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "supersededBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contraindication_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "genericName" TEXT,
    "rxNormCode" TEXT,
    "ndc" TEXT,
    "drugClass" TEXT,
    "dose" TEXT,
    "doseValue" DOUBLE PRECISION,
    "doseUnit" TEXT,
    "route" TEXT,
    "frequency" TEXT,
    "status" "MedicationStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "discontinuedReason" TEXT,
    "prescribedBy" TEXT,
    "prescribedDate" TIMESTAMP(3),
    "targetDose" TEXT,
    "targetDoseValue" DOUBLE PRECISION,
    "atTargetDose" BOOLEAN NOT NULL DEFAULT false,
    "percentOfTarget" DOUBLE PRECISION,
    "fhirMedicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conditions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "conditionName" TEXT NOT NULL,
    "icd10Code" TEXT,
    "snomedCode" TEXT,
    "category" "ConditionCategory" NOT NULL DEFAULT 'PROBLEM_LIST',
    "clinicalStatus" "ConditionClinicalStatus" NOT NULL DEFAULT 'ACTIVE',
    "verificationStatus" "ConditionVerificationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "severity" TEXT,
    "onsetDate" TIMESTAMP(3),
    "abatementDate" TIMESTAMP(3),
    "recordedDate" TIMESTAMP(3),
    "recordedBy" TEXT,
    "bodySite" TEXT,
    "fhirConditionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plans" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "CarePlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "intent" TEXT NOT NULL DEFAULT 'plan',
    "category" TEXT,
    "moduleType" "ModuleType",
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "goals" JSONB,
    "activities" JSONB,
    "author" TEXT,
    "careTeam" JSONB,
    "fhirCarePlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "ipAddress" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "patientId" TEXT,
    "description" TEXT,
    "previousValues" JSONB,
    "newValues" JSONB,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "stepData" JSONB,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_notes" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "noteType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breach_incidents" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL,
    "discoveredBy" TEXT NOT NULL,
    "incidentType" "BreachType" NOT NULL,
    "severity" "BreachSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "affectedRecords" INTEGER,
    "affectedFields" TEXT[],
    "affectedPatientIds" TEXT[],
    "investigationStarted" TIMESTAMP(3),
    "riskAssessmentCompleted" TIMESTAMP(3),
    "hhsNotifiedAt" TIMESTAMP(3),
    "individualsNotifiedAt" TIMESTAMP(3),
    "mediaNotifiedAt" TIMESTAMP(3),
    "rootCause" TEXT,
    "containmentActions" TEXT,
    "remediationPlan" TEXT,
    "status" "BreachStatus" NOT NULL DEFAULT 'DISCOVERED',
    "statusHistory" JSONB,
    "internalNotes" TEXT,
    "legalReview" BOOLEAN NOT NULL DEFAULT false,
    "legalReviewedBy" TEXT,
    "legalReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "breach_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_data_requests" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "requestType" "DataRequestType" NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestorEmail" TEXT,
    "requestorRelation" TEXT,
    "status" "DataRequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "assignedTo" TEXT,
    "processedAt" TIMESTAMP(3),
    "responseNotes" TEXT,
    "denialReason" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "extensionGranted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_data_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_icd10" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isLeaf" BOOLEAN NOT NULL DEFAULT true,
    "parentCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "term_icd10_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "term_rxnorm" (
    "rxcui" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "termType" TEXT NOT NULL,
    "drugClasses" TEXT[],
    "brandNames" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "term_rxnorm_pkey" PRIMARY KEY ("rxcui")
);

-- CreateTable
CREATE TABLE "term_loinc" (
    "loincNum" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "scaleType" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "term_loinc_pkey" PRIMARY KEY ("loincNum")
);

-- CreateTable
CREATE TABLE "term_cpt" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "term_cpt_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "term_msdrg" (
    "drgCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mdc" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "avgPayment" DOUBLE PRECISION NOT NULL,
    "relWeight" DOUBLE PRECISION NOT NULL,
    "fiscalYear" INTEGER NOT NULL DEFAULT 2025,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "term_msdrg_pkey" PRIMARY KEY ("drgCode")
);

-- CreateTable
CREATE TABLE "upload_jobs" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "s3Key" TEXT,
    "moduleId" TEXT NOT NULL,
    "status" "UploadJobStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "phiDetected" BOOLEAN NOT NULL DEFAULT false,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "patientsCreated" INTEGER NOT NULL DEFAULT 0,
    "patientsUpdated" INTEGER NOT NULL DEFAULT 0,
    "gapFlagsCreated" INTEGER NOT NULL DEFAULT 0,
    "validationErrors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_tokens" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_gap_valueset" (
    "gapId" TEXT NOT NULL,
    "gapName" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "diagnosisCodes" TEXT[],
    "exclusionCodes" TEXT[],
    "procedureCodes" TEXT[],
    "medicationCodes" TEXT[],
    "labCodes" TEXT[],
    "labThresholds" JSONB NOT NULL DEFAULT '[]',
    "deviceCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "term_gap_valueset_pkey" PRIMARY KEY ("gapId")
);

-- CreateTable
CREATE TABLE "user_mfa" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enabledAt" TIMESTAMP(3),
    "backupCodes" TEXT[],
    "backupCodesUsed" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_mfa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "mfaVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_allowlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "ip_allowlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_npi_key" ON "hospitals"("npi");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_redoxSourceId_key" ON "hospitals"("redoxSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_redoxDestinationId_key" ON "hospitals"("redoxDestinationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_resetToken_key" ON "users"("resetToken");

-- CreateIndex
CREATE INDEX "patients_fhirPatientId_idx" ON "patients"("fhirPatientId");

-- CreateIndex
CREATE INDEX "patients_email_idx" ON "patients"("email");

-- CreateIndex
CREATE INDEX "patients_lastName_firstName_idx" ON "patients"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "patients_hospitalId_mrn_key" ON "patients"("hospitalId", "mrn");

-- CreateIndex
CREATE UNIQUE INDEX "encounters_fhirEncounterId_key" ON "encounters"("fhirEncounterId");

-- CreateIndex
CREATE INDEX "encounters_hospitalId_startDateTime_idx" ON "encounters"("hospitalId", "startDateTime");

-- CreateIndex
CREATE INDEX "encounters_patientId_startDateTime_idx" ON "encounters"("patientId", "startDateTime");

-- CreateIndex
CREATE INDEX "observations_hospitalId_observedDateTime_idx" ON "observations"("hospitalId", "observedDateTime");

-- CreateIndex
CREATE INDEX "observations_patientId_observationType_idx" ON "observations"("patientId", "observationType");

-- CreateIndex
CREATE INDEX "observations_fhirObservationId_idx" ON "observations"("fhirObservationId");

-- CreateIndex
CREATE INDEX "observations_observationType_observedDateTime_idx" ON "observations"("observationType", "observedDateTime");

-- CreateIndex
CREATE INDEX "orders_hospitalId_orderedDateTime_idx" ON "orders"("hospitalId", "orderedDateTime");

-- CreateIndex
CREATE INDEX "orders_patientId_orderType_idx" ON "orders"("patientId", "orderType");

-- CreateIndex
CREATE INDEX "orders_fhirOrderId_idx" ON "orders"("fhirOrderId");

-- CreateIndex
CREATE INDEX "alerts_hospitalId_severity_idx" ON "alerts"("hospitalId", "severity");

-- CreateIndex
CREATE INDEX "alerts_patientId_moduleType_idx" ON "alerts"("patientId", "moduleType");

-- CreateIndex
CREATE UNIQUE INDEX "login_sessions_sessionToken_key" ON "login_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "user_activities_hospitalId_timestamp_idx" ON "user_activities"("hospitalId", "timestamp");

-- CreateIndex
CREATE INDEX "user_activities_userId_timestamp_idx" ON "user_activities"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "user_activities_sessionId_idx" ON "user_activities"("sessionId");

-- CreateIndex
CREATE INDEX "user_activities_activityType_timestamp_idx" ON "user_activities"("activityType", "timestamp");

-- CreateIndex
CREATE INDEX "feature_usage_hospitalId_period_periodStart_idx" ON "feature_usage"("hospitalId", "period", "periodStart");

-- CreateIndex
CREATE INDEX "feature_usage_featureName_period_idx" ON "feature_usage"("featureName", "period");

-- CreateIndex
CREATE UNIQUE INDEX "feature_usage_hospitalId_userId_featureName_period_periodSt_key" ON "feature_usage"("hospitalId", "userId", "featureName", "period", "periodStart");

-- CreateIndex
CREATE INDEX "performance_metrics_metricType_period_periodStart_idx" ON "performance_metrics"("metricType", "period", "periodStart");

-- CreateIndex
CREATE INDEX "performance_metrics_hospitalId_period_idx" ON "performance_metrics"("hospitalId", "period");

-- CreateIndex
CREATE INDEX "business_metrics_hospitalId_category_period_idx" ON "business_metrics"("hospitalId", "category", "period");

-- CreateIndex
CREATE INDEX "business_metrics_metricName_period_idx" ON "business_metrics"("metricName", "period");

-- CreateIndex
CREATE UNIQUE INDEX "business_metrics_hospitalId_metricName_period_periodStart_d_key" ON "business_metrics"("hospitalId", "metricName", "period", "periodStart", "dimension1Value", "dimension2Value");

-- CreateIndex
CREATE INDEX "report_generations_hospitalId_createdAt_idx" ON "report_generations"("hospitalId", "createdAt");

-- CreateIndex
CREATE INDEX "report_generations_userId_createdAt_idx" ON "report_generations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "report_generations_reportType_createdAt_idx" ON "report_generations"("reportType", "createdAt");

-- CreateIndex
CREATE INDEX "error_logs_errorType_timestamp_idx" ON "error_logs"("errorType", "timestamp");

-- CreateIndex
CREATE INDEX "error_logs_hospitalId_timestamp_idx" ON "error_logs"("hospitalId", "timestamp");

-- CreateIndex
CREATE INDEX "error_logs_errorHash_idx" ON "error_logs"("errorHash");

-- CreateIndex
CREATE INDEX "error_logs_severity_isResolved_idx" ON "error_logs"("severity", "isResolved");

-- CreateIndex
CREATE UNIQUE INDEX "cql_rules_name_version_key" ON "cql_rules"("name", "version");

-- CreateIndex
CREATE INDEX "cql_results_patientId_createdAt_idx" ON "cql_results"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "cql_results_ruleId_createdAt_idx" ON "cql_results"("ruleId", "createdAt");

-- CreateIndex
CREATE INDEX "therapy_gaps_patientId_identifiedAt_idx" ON "therapy_gaps"("patientId", "identifiedAt");

-- CreateIndex
CREATE INDEX "therapy_gaps_module_gapType_idx" ON "therapy_gaps"("module", "gapType");

-- CreateIndex
CREATE INDEX "phenotypes_patientId_phenotypeName_idx" ON "phenotypes"("patientId", "phenotypeName");

-- CreateIndex
CREATE INDEX "phenotypes_phenotypeName_status_idx" ON "phenotypes"("phenotypeName", "status");

-- CreateIndex
CREATE INDEX "cross_referrals_patientId_status_idx" ON "cross_referrals"("patientId", "status");

-- CreateIndex
CREATE INDEX "cross_referrals_fromModule_toModule_idx" ON "cross_referrals"("fromModule", "toModule");

-- CreateIndex
CREATE INDEX "drug_titrations_patientId_drugClass_idx" ON "drug_titrations"("patientId", "drugClass");

-- CreateIndex
CREATE INDEX "drug_titrations_nextStepDate_idx" ON "drug_titrations"("nextStepDate");

-- CreateIndex
CREATE INDEX "quality_measures_measureCode_periodStart_idx" ON "quality_measures"("measureCode", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "quality_measures_hospitalId_measureCode_reportingPeriod_key" ON "quality_measures"("hospitalId", "measureCode", "reportingPeriod");

-- CreateIndex
CREATE INDEX "device_eligibility_patientId_deviceType_idx" ON "device_eligibility"("patientId", "deviceType");

-- CreateIndex
CREATE INDEX "device_eligibility_evaluatedAt_idx" ON "device_eligibility"("evaluatedAt");

-- CreateIndex
CREATE INDEX "risk_score_assessments_patientId_scoreType_idx" ON "risk_score_assessments"("patientId", "scoreType");

-- CreateIndex
CREATE INDEX "risk_score_assessments_scoreType_module_idx" ON "risk_score_assessments"("scoreType", "module");

-- CreateIndex
CREATE INDEX "risk_score_assessments_hospitalId_calculatedAt_idx" ON "risk_score_assessments"("hospitalId", "calculatedAt");

-- CreateIndex
CREATE INDEX "intervention_tracking_patientId_module_idx" ON "intervention_tracking"("patientId", "module");

-- CreateIndex
CREATE INDEX "intervention_tracking_module_category_idx" ON "intervention_tracking"("module", "category");

-- CreateIndex
CREATE INDEX "intervention_tracking_hospitalId_performedAt_idx" ON "intervention_tracking"("hospitalId", "performedAt");

-- CreateIndex
CREATE INDEX "intervention_tracking_status_module_idx" ON "intervention_tracking"("status", "module");

-- CreateIndex
CREATE INDEX "contraindication_assessments_patientId_module_idx" ON "contraindication_assessments"("patientId", "module");

-- CreateIndex
CREATE INDEX "contraindication_assessments_therapyName_level_idx" ON "contraindication_assessments"("therapyName", "level");

-- CreateIndex
CREATE INDEX "contraindication_assessments_hospitalId_assessedAt_idx" ON "contraindication_assessments"("hospitalId", "assessedAt");

-- CreateIndex
CREATE INDEX "medications_patientId_drugClass_idx" ON "medications"("patientId", "drugClass");

-- CreateIndex
CREATE INDEX "medications_hospitalId_status_idx" ON "medications"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "medications_rxNormCode_idx" ON "medications"("rxNormCode");

-- CreateIndex
CREATE INDEX "conditions_patientId_clinicalStatus_idx" ON "conditions"("patientId", "clinicalStatus");

-- CreateIndex
CREATE INDEX "conditions_hospitalId_icd10Code_idx" ON "conditions"("hospitalId", "icd10Code");

-- CreateIndex
CREATE INDEX "conditions_icd10Code_idx" ON "conditions"("icd10Code");

-- CreateIndex
CREATE INDEX "care_plans_patientId_status_idx" ON "care_plans"("patientId", "status");

-- CreateIndex
CREATE INDEX "care_plans_hospitalId_moduleType_idx" ON "care_plans"("hospitalId", "moduleType");

-- CreateIndex
CREATE INDEX "audit_logs_hospitalId_timestamp_idx" ON "audit_logs"("hospitalId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_userId_timestamp_idx" ON "audit_logs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_patientId_timestamp_idx" ON "audit_logs"("patientId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_action_resourceType_idx" ON "audit_logs"("action", "resourceType");

-- CreateIndex
CREATE INDEX "onboarding_hospitalId_stepName_idx" ON "onboarding"("hospitalId", "stepName");

-- CreateIndex
CREATE INDEX "onboarding_status_idx" ON "onboarding"("status");

-- CreateIndex
CREATE INDEX "internal_notes_hospitalId_createdAt_idx" ON "internal_notes"("hospitalId", "createdAt");

-- CreateIndex
CREATE INDEX "internal_notes_noteType_idx" ON "internal_notes"("noteType");

-- CreateIndex
CREATE INDEX "breach_incidents_status_idx" ON "breach_incidents"("status");

-- CreateIndex
CREATE INDEX "breach_incidents_severity_idx" ON "breach_incidents"("severity");

-- CreateIndex
CREATE INDEX "breach_incidents_discoveredAt_idx" ON "breach_incidents"("discoveredAt");

-- CreateIndex
CREATE INDEX "patient_data_requests_hospitalId_status_idx" ON "patient_data_requests"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "patient_data_requests_patientId_idx" ON "patient_data_requests"("patientId");

-- CreateIndex
CREATE INDEX "patient_data_requests_dueDate_idx" ON "patient_data_requests"("dueDate");

-- CreateIndex
CREATE INDEX "upload_jobs_hospitalId_createdAt_idx" ON "upload_jobs"("hospitalId", "createdAt");

-- CreateIndex
CREATE INDEX "upload_jobs_status_idx" ON "upload_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invite_tokens_token_key" ON "invite_tokens"("token");

-- CreateIndex
CREATE INDEX "invite_tokens_token_idx" ON "invite_tokens"("token");

-- CreateIndex
CREATE INDEX "invite_tokens_hospitalId_idx" ON "invite_tokens"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "user_mfa_userId_key" ON "user_mfa"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_tokenHash_key" ON "user_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_expiresAt_idx" ON "user_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "ip_allowlist_userId_idx" ON "ip_allowlist"("userId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_sessions" ADD CONSTRAINT "login_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_sessions" ADD CONSTRAINT "login_sessions_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_usage" ADD CONSTRAINT "feature_usage_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_usage" ADD CONSTRAINT "feature_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_generations" ADD CONSTRAINT "report_generations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_generations" ADD CONSTRAINT "report_generations_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cql_results" ADD CONSTRAINT "cql_results_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cql_results" ADD CONSTRAINT "cql_results_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cql_results" ADD CONSTRAINT "cql_results_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "cql_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_gaps" ADD CONSTRAINT "therapy_gaps_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_gaps" ADD CONSTRAINT "therapy_gaps_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phenotypes" ADD CONSTRAINT "phenotypes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phenotypes" ADD CONSTRAINT "phenotypes_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cross_referrals" ADD CONSTRAINT "cross_referrals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cross_referrals" ADD CONSTRAINT "cross_referrals_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_titrations" ADD CONSTRAINT "drug_titrations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_titrations" ADD CONSTRAINT "drug_titrations_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_measures" ADD CONSTRAINT "quality_measures_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_eligibility" ADD CONSTRAINT "device_eligibility_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_eligibility" ADD CONSTRAINT "device_eligibility_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_score_assessments" ADD CONSTRAINT "risk_score_assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_score_assessments" ADD CONSTRAINT "risk_score_assessments_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_tracking" ADD CONSTRAINT "intervention_tracking_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_tracking" ADD CONSTRAINT "intervention_tracking_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contraindication_assessments" ADD CONSTRAINT "contraindication_assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contraindication_assessments" ADD CONSTRAINT "contraindication_assessments_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding" ADD CONSTRAINT "onboarding_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mfa" ADD CONSTRAINT "user_mfa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ip_allowlist" ADD CONSTRAINT "ip_allowlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
