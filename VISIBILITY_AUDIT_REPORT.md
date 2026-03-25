# TAILRD PLATFORM — COMPREHENSIVE VISIBILITY AUDIT
## Date: 2026-03-20

---

# SECTION A: ACTUAL VIEW COMPONENT MAP

Every route renders a custom standalone view component. `BaseCareTeamView` and `BaseServiceLineView` are imported **ONLY** in dead config files — zero actual views use them. `BaseExecutiveView` is used by **ValvularExecutiveView only** (the sole module using any Base component).

| Module | Executive View | Service Line View | Care Team View |
|--------|---------------|-------------------|----------------|
| **HF** | `src/ui/heartFailure/views/ExecutiveView.tsx` | `src/ui/heartFailure/views/ServiceLineView.tsx` | `src/ui/heartFailure/views/CareTeamView.tsx` |
| **EP** | `src/ui/electrophysiology/views/EPExecutiveView.tsx` | `src/ui/electrophysiology/views/EPServiceLineView.tsx` | `src/ui/electrophysiology/views/EPCareTeamView.tsx` |
| **CAD** | `src/ui/coronaryIntervention/views/CoronaryExecutiveView.tsx` | `src/ui/coronaryIntervention/views/CoronaryServiceLineView.tsx` | `src/ui/coronaryIntervention/views/CoronaryCareTeamView.tsx` |
| **SH** | `src/ui/structuralHeart/views/StructuralExecutiveView.tsx` | `src/ui/structuralHeart/views/StructuralServiceLineView.tsx` | `src/ui/structuralHeart/views/StructuralCareTeamView.tsx` |
| **PV** | `src/ui/peripheralVascular/views/PeripheralExecutiveView.tsx` | `src/ui/peripheralVascular/views/PeripheralServiceLineView.tsx` | `src/ui/peripheralVascular/views/PeripheralCareTeamView.tsx` |
| **VD** | `src/ui/valvularDisease/views/ValvularExecutiveView.tsx` | `src/ui/valvularDisease/views/ValvularServiceLineView.tsx` | `src/ui/valvularDisease/views/ValvularCareTeamView.tsx` |

### Dead Config Files (12 files — NONE of these render):
- `src/ui/*/config/careTeamConfig.tsx` (6 files)
- `src/ui/*/config/serviceLineConfig.tsx` (6 files)
- `src/ui/*/config/executiveConfig.ts` (6 files — these export KPI data used by some executive views, but their component references are dead)

---

# SECTION B: COMPONENT STATUS (CONFIG-ONLY and ORPHANED)

## B1: CONFIG-ONLY Components (Built, imported only in dead configs, NEVER rendered)

| # | Component | File | Config File(s) | Status |
|---|-----------|------|----------------|--------|
| 1 | **KCCQOutcomesPanel** | `src/ui/heartFailure/components/service-line/KCCQOutcomesPanel.tsx` | HF serviceLineConfig | **B: CONFIG-ONLY** |
| 2 | **SAQOutcomesPanel** | `src/ui/coronaryIntervention/components/service-line/SAQOutcomesPanel.tsx` | CAD serviceLineConfig | **B: CONFIG-ONLY** |
| 3 | **PhenotypeDetectionChart** | `src/ui/heartFailure/components/PhenotypeDetectionChart.tsx` | HF serviceLineConfig | **B: CONFIG-ONLY** |
| 4 | **EPPhenotypeDetectionChart** | `src/ui/electrophysiology/components/EPPhenotypeDetectionChart.tsx` | EP serviceLineConfig | **B: CONFIG-ONLY** |
| 5 | **SHPhenotypeDetectionChart** | `src/ui/structuralHeart/components/SHPhenotypeDetectionChart.tsx` | SH serviceLineConfig | **B: CONFIG-ONLY** |
| 6 | **SHProviderScorecard** | `src/ui/structuralHeart/components/service-line/SHProviderScorecard.tsx` | SH serviceLineConfig | **B: CONFIG-ONLY** |
| 7 | **EPOutcomesTrends** | `src/ui/electrophysiology/components/executive/EPOutcomesTrends.tsx` | EP serviceLineConfig | **B: CONFIG-ONLY** |
| 8 | **EPRiskStratification** | `src/ui/electrophysiology/components/executive/EPRiskStratification.tsx` | EP careTeamConfig | **B: CONFIG-ONLY** |
| 9 | **EPRealTimeHospitalAlerts** | `src/ui/electrophysiology/components/care-team/EPRealTimeHospitalAlerts.tsx` | EP careTeamConfig | **B: CONFIG-ONLY** |
| 10 | **SHRealTimeHospitalAlerts** | `src/ui/structuralHeart/components/care-team/SHRealTimeHospitalAlerts.tsx` | SH careTeamConfig | **B: CONFIG-ONLY** |
| 11 | **HFAdvancedTherapyPipeline** | Defined inline in `src/ui/heartFailure/config/serviceLineConfig.tsx` | HF serviceLineConfig (inline) | **B: CONFIG-ONLY** |

### Shared Risk Calculators (from `src/components/riskCalculators/`) — CONFIG-ONLY:

| # | Component | Config File(s) | Active View? |
|---|-----------|----------------|-------------|
| 12 | **CRTICDEligibilityCalculator** | EP careTeamConfig, HF careTeamConfig | **NO** — config only |
| 13 | **HASBLEDCalculator** | SH careTeamConfig | **NO** — config only |
| 14 | **WIFIClassificationCalculator** | PV careTeamConfig | **NO** — config only |
| 15 | **STSRiskCalculator** (shared version at `components/riskCalculators/`) | SH careTeamConfig, VD careTeamConfig | **NO** — config only (Note: SH ServiceLine uses its OWN `STSRiskCalculator` from `../components/STSRiskCalculator` — a different file) |
| 16 | **SYNTAXScoreCalculator** (shared version at `components/riskCalculators/`) | CAD careTeamConfig | **NO** — config only (Note: CAD ServiceLine uses its OWN `SYNTAXScoreCalculator` from `../components/` — a different file) |

### Shared Risk Calculators — COMPLETELY ORPHANED (imported NOWHERE):

| # | Component | File | Status |
|---|-----------|------|--------|
| 17 | **MAGGICCalculator** | `src/components/riskCalculators/MAGGICCalculator.tsx` | **D: ORPHANED** |
| 18 | **FRAMINGHAMHFCalculator** | `src/components/riskCalculators/FRAMINGHAMHFCalculator.tsx` | **D: ORPHANED** |
| 19 | **ORBITBleedingCalculator** | `src/components/riskCalculators/ORBITBleedingCalculator.tsx` | **D: ORPHANED** |
| 20 | **WellsPECalculator** | `src/components/riskCalculators/WellsPECalculator.tsx` | **D: ORPHANED** |
| 21 | **INTERMACSCalculator** | `src/components/riskCalculators/INTERMACSCalculator.tsx` | **D: ORPHANED** |
| 22 | **GRACEScoreCalculator** (shared version) | `src/components/riskCalculators/GRACEScoreCalculator.tsx` | **D: ORPHANED** (CAD uses its own version) |
| 23 | **CHA2DS2VAScCalculator** (shared version) | `src/components/riskCalculators/CHA2DS2VAScCalculator.tsx` | **D: ORPHANED** (EP uses its own version) |

### Shared Feature Components — COMPLETELY ORPHANED (imported NOWHERE):

| # | Component | File | Status |
|---|-----------|------|--------|
| 24 | **CrossReferralEngine** | `src/components/crossReferral/CrossReferralEngine.tsx` | **D: ORPHANED** |
| 25 | **ReferralPathwayCard** | `src/components/crossReferral/ReferralPathwayCard.tsx` | **D: ORPHANED** |
| 26 | **ReferralWorkflow** | `src/components/crossReferral/ReferralWorkflow.tsx` | **D: ORPHANED** |
| 27 | **PhenotypeScreeningPanel** | `src/components/phenotypeDetection/PhenotypeScreeningPanel.tsx` | **D: ORPHANED** |
| 28 | **AmyloidosisScreener** | `src/components/phenotypeDetection/AmyloidosisScreener.tsx` | **D: ORPHANED** |
| 29 | **PhenotypeDetailModal** | `src/components/phenotypeDetection/PhenotypeDetailModal.tsx` | **D: ORPHANED** |
| 30 | **PopulationOverviewDashboard** | `src/components/populationHealth/PopulationOverviewDashboard.tsx` | **D: ORPHANED** |
| 31 | **PatientRiskStratification** | `src/components/populationHealth/PatientRiskStratification.tsx` | **D: ORPHANED** |
| 32 | **TherapyGapDashboard** | `src/components/therapyGap/TherapyGapDashboard.tsx` | **D: ORPHANED** |
| 33 | **DeviceUnderutilizationPanel** | `src/components/therapyGap/DeviceUnderutilizationPanel.tsx` | **D: ORPHANED** |
| 34 | **GDMTOptimizationTracker** | `src/components/therapyGap/GDMTOptimizationTracker.tsx` | **D: ORPHANED** |
| 35 | **ROICalculationEngine** | `src/components/financial/ROICalculationEngine.tsx` | **D: ORPHANED** |
| 36 | **QualityReportGenerator** | `src/components/reporting/QualityReportGenerator.tsx` | **D: ORPHANED** |
| 37 | **PremiumColorTest** | `src/components/test/PremiumColorTest.tsx` | **D: ORPHANED** (test file) |

### Shared Components — Missing from some views:

| Component | HF SL | EP SL | CAD SL | SH SL | PV SL | VD SL |
|-----------|-------|-------|--------|-------|-------|-------|
| **AutomatedReportingSystem** | ACTIVE | ACTIVE | **MISSING** | **MISSING** | **MISSING** | **MISSING** |
| **PatientRiskHeatmap** | ACTIVE | ACTIVE | **MISSING** | **MISSING** | ACTIVE | **MISSING** |
| **CareTeamNetworkGraph** | ACTIVE | ACTIVE | **MISSING** | **MISSING** | ACTIVE | **MISSING** |

(All 6 serviceLineConfig files import these 3 shared components, but only HF, EP, and PV actual views import them.)

---

# SECTION C: TAB VISIBILITY AUDIT

## HF Service Line (13 tabs) — ServiceLineView.tsx
| Tab ID | Label | Component | Visible? | Issue? |
|--------|-------|-----------|----------|--------|
| gdmt | GDMT Analytics | GDMTAnalyticsDashboard | Yes | None |
| heatmap | Patient Risk Heatmap | PatientRiskHeatmap | Yes | None |
| providers | Provider Performance | ProviderScorecard | Yes | None |
| devices | Device Pathways | DevicePathwayFunnel | Yes | None |
| advanced-devices | Advanced Devices | AdvancedDeviceTracker | Yes | None |
| phenotypes | Basic Phenotypes | HFPhenotypeClassification | Yes | None |
| advanced-phenotypes | Specialty Phenotypes | SpecialtyPhenotypesDashboard | Yes | None |
| safety | Safety Screening | GDMTContraindicationChecker | Yes | None |
| network | Care Team Network | CareTeamNetworkGraph | Yes | None |
| hf-care-network | HF Care Coordination | HFCareNetworkVisualization | Yes | None |
| quality | Quality Metrics | QualityMetricsDashboard | Yes | None |
| reporting | Automated Reports | AutomatedReportingSystem | Yes | None |
| gap-detection | Gap Detection (25-Gap) | ClinicalGapDetectionDashboard | Yes | None |
| **MISSING** | **PRO-Outcomes (KCCQ)** | **KCCQOutcomesPanel** | **N/A** | **Tab not defined — component exists but no tab** |
| **MISSING** | **Phenotype Detection** | **PhenotypeDetectionChart** | **N/A** | **Tab not defined — component exists but no tab** |
| **MISSING** | **Advanced Therapy Pipeline** | **HFAdvancedTherapyPipeline** | **N/A** | **Defined only in dead config** |

## HF Care Team (8 tabs) — CareTeamView.tsx
| Tab ID | Label | Component | Issue? |
|--------|-------|-----------|--------|
| dashboard | Dashboard | RealTimeHospitalAlerts + CareGapAnalyzer + TeamCollaboration | None |
| patients | Patient Worklist | PatientWorklistEnhanced | None |
| workflow | Workflow | ReferralTrackerEnhanced | None |
| safety | Safety | GDMTContraindicationChecker | None |
| team | Team | TeamCollaborationPanel | None |
| documentation | Documentation | Inline content | None |
| clinicaltools | Clinical Tools | HFPhenotypeClassification + GDMTContraindicationChecker + MAGGICScoreCalculator + SpecialtyPhenotypesDashboard + AdvancedDeviceTracker | None |
| clinical-gaps | Clinical Gaps | ClinicalGapDetectionDashboard | None |

## EP Service Line (20 tabs) — EPServiceLineView.tsx
| Tab ID | Label | Component | Issue? |
|--------|-------|-----------|--------|
| ep-analytics | EP Analytics | ElectrophysiologyAnalytics (inline) | None |
| heatmap | Risk Heatmap | PatientRiskHeatmap | None |
| phenotype-chart | Phenotype Chart | Inline placeholder | None |
| gap-analysis | Gap Analysis | EPGapAnalysisPanel | None |
| physician-heatmap | Physician Heatmap | EPPhysicianPerformanceHeatmap | None |
| equity-analysis | Equity Analysis | EPEquityAnalysis | None |
| outcomes-cohort | Outcomes by Cohort | EPOutcomesByCohort | None |
| patient-panel | Patient Panel | EPPatientPanelTable | None |
| ep-decision | Decision Support | EPClinicalDecisionSupport | None |
| ep-safety | Safety Checker | AnticoagulationSafetyChecker | None |
| laac-risk | LAAC Risk | LAACRiskDashboard | None |
| ep-clinical | Clinical Support | EPAutomatedClinicalSupport | None |
| ep-roi | ROI Calculator | EPROICalculator | None |
| ep-device-network | Device Network | EPDeviceNetworkVisualization | None |
| ep-patient | Patient Detail | PatientDetailPanel | None |
| network | Care Network | CareTeamNetworkGraph | None |
| reporting | Reporting | AutomatedReportingSystem | None |
| gap-detection | Gap Detection (20-Gap) | EPClinicalGapDetectionDashboard | None |
| **MISSING** | **Phenotype Detection** | **EPPhenotypeDetectionChart** | **Component exists, no tab (inline placeholder used instead)** |
| **MISSING** | **Outcomes Trends** | **EPOutcomesTrends** | **Config-only, no tab** |

## EP Care Team (3 modes) — EPCareTeamView.tsx
| Mode | Label | Component | Issue? |
|------|-------|-----------|--------|
| dashboard | Dashboard | EPPriorityWorklist + EPPatientDetailPanel + EPPatientTimeline + EPActionQueue + EPAlertDashboard + EPTreatmentGapQueue + EPFollowUpQueue | None |
| clinicaltools | Clinical Intelligence | EPPhenotypeClassification + EPCHADSVAScCalculator + EPAnticoagulationContraindicationChecker + EPAdvancedDeviceTracker | None |
| clinical-gaps | Clinical Gaps | EPClinicalGapDetectionDashboard | None |
| **MISSING** | **Real-Time Alerts** | **EPRealTimeHospitalAlerts** | **Config-only — exists as component, never rendered** |
| **MISSING** | **Risk Stratification** | **EPRiskStratification** | **Config-only — never rendered** |

## CAD Service Line (13 tabs) — CoronaryServiceLineView.tsx
| Tab ID | Label | Component | Issue? |
|--------|-------|-----------|--------|
| cabg-vs-pci | CABG vs PCI | Inline decision tool | None |
| protected-pci | Protected PCI | Inline content | None |
| multi-arterial | Multi-Arterial | Inline content | None |
| on-off-pump | On/Off Pump | Inline content | None |
| grace | GRACE Score | GRACEScoreCalculator | None |
| timi | TIMI Score | TIMIScoreCalculator | None |
| syntax | SYNTAX Score | SYNTAXScoreCalculator | None |
| safety | Safety Screening | CoronarySafetyScreening | None |
| network | PCI Network | PCINetworkVisualization | None |
| analytics | Analytics | Inline content | None |
| outcomes | Outcomes | Inline content | None |
| reporting | Reporting | Inline content | None |
| gap-detection | Gap Detection (31-Gap) | CADClinicalGapDetectionDashboard | None |
| **MISSING** | **PRO-Outcomes (SAQ)** | **SAQOutcomesPanel** | **Component exists, no tab** |
| **MISSING** | **Risk Heatmap** | **PatientRiskHeatmap** | **Not imported** |
| **MISSING** | **Care Network** | **CareTeamNetworkGraph** | **Not imported** |
| **MISSING** | **Automated Reports** | **AutomatedReportingSystem** | **Not imported** |

## CAD Care Team (10 tabs) — CoronaryCareTeamView.tsx
| Tab ID | Label | Component | Issue? |
|--------|-------|-----------|--------|
| dashboard | Dashboard | Inline metrics + patient rows | None |
| worklist | Worklist | CoronaryWorklist | None |
| case-planning | Case Planning | CasePlanningTool | None |
| pci-checklist | PCI Checklist | ProtectedPCIChecklist | None |
| safety | Safety | AntiplateletContraindicationChecker | None |
| clinical-intel | Clinical Intelligence | CoronaryPhenotypeClassification + CoronaryRiskScoreCalculator + CoronarySpecialtyPhenotypesDashboard + AdvancedInterventionTracker | None |
| clinical-gaps | Clinical Gaps | CADClinicalGapDetectionDashboard | None |
| (remaining) | Schedule/Outcomes/Reports | Inline content | None |

## SH Service Line (12 tabs) — StructuralServiceLineView.tsx
| Tab ID | Label | Component | Issue? |
|--------|-------|-----------|--------|
| tavr | TAVR Analytics | TAVRAnalyticsDashboard | None |
| teer-mitral | TEER Mitral | Inline funnel content | None |
| teer-tricuspid | TEER Tricuspid | Inline content | None |
| tmvr | TMVR | Inline content | None |
| pfo-asd | PFO/ASD | Inline content | None |
| sts-risk | STS Risk | STSRiskCalculator (module-specific) | None |
| referrals | Referral Network | StructuralReferralNetworkVisualization | None |
| analytics | Analytics | Inline content | None |
| outcomes | Outcomes | Inline content | None |
| quality | Quality | Inline content | None |
| reporting | Reporting | Inline content | None |
| gap-detection | Gap Detection (8-Gap) | SHClinicalGapDetectionDashboard | None |
| **MISSING** | **Phenotype Detection** | **SHPhenotypeDetectionChart** | **Config-only** |
| **MISSING** | **Provider Scorecard** | **SHProviderScorecard** | **Config-only** |
| **MISSING** | **Risk Heatmap** | **PatientRiskHeatmap** | **Not imported** |
| **MISSING** | **Care Network** | **CareTeamNetworkGraph** | **Not imported** |
| **MISSING** | **Automated Reports** | **AutomatedReportingSystem** | **Not imported** |

## SH Care Team — StructuralCareTeamView.tsx
| Tab ID | Label | Component | Issue? |
|--------|-------|-----------|--------|
| dashboard | Dashboard | Inline metrics + patient rows | None |
| patients | Patient Worklist | Inline patient list | None |
| tavr-analytics | TAVR Analytics | TAVRAnalyticsDashboard | None |
| referrals | Referral Network | StructuralReferralNetworkVisualization | None |
| safety | Safety | SHValveTherapyContraindicationChecker | None |
| clinical-intel | Clinical Intelligence | SHValvePhenotypeClassification + SHValveRiskScoreCalculator + SHSpecialtyPhenotypesDashboard + SHAdvancedProcedureTracker | None |
| clinical-gaps | Clinical Gaps | SHClinicalGapDetectionDashboard | None |
| (remaining) | Schedule/Outcomes/Reports | Inline content | None |
| **MISSING** | **Real-Time Alerts** | **SHRealTimeHospitalAlerts** | **Config-only** |

## PV Service Line — PeripheralServiceLineView.tsx
| Tab ID | Label | Component | Issue? |
|--------|-------|-----------|--------|
| analytics | Analytics | Inline content | None |
| heatmap | Risk Heatmap | PatientRiskHeatmap | None |
| wifi | WIfI Classification | WIfIClassification | None |
| limb-salvage | Limb Salvage | LimbSalvageScreening | None |
| wound-care-network | Wound Care Network | PVWoundCareNetworkVisualization | None |
| pad-reporting | PAD Reporting | PADReportingSystem | None |
| network | Care Network | CareTeamNetworkGraph | None |
| gap-detection | Gap Detection (12-Gap) | PVClinicalGapDetectionDashboard | None |
| **MISSING** | **Automated Reports** | **AutomatedReportingSystem** | **Not imported** |

## PV Care Team — PeripheralCareTeamView.tsx
| Tab ID | Label | Component | Issue? |
|--------|-------|-----------|--------|
| dashboard | Dashboard | Inline metrics | None |
| worklist | Worklist | PeripheralWorklist | None |
| limb-salvage | Limb Salvage | LimbSalvageChecklist | None |
| case-planning | Case Planning | CasePlanningWorksheet | None |
| wound-care | Wound Care | WoundCareIntegration | None |
| safety | Safety | InterventionContraindicationChecker | None |
| clinical-intel | Clinical Intelligence | PADPhenotypeClassification + PADRiskScoreCalculator + PADSpecialtyPhenotypesDashboard + AdvancedInterventionTracker | None |
| clinical-gaps | Clinical Gaps | PVClinicalGapDetectionDashboard | None |
| (remaining) | Schedule/Outcomes/Reports | Inline content | None |

## VD Service Line — ValvularServiceLineView.tsx
Has valve-specific tabs with ValvePatientHeatmap, ValvularSurgicalNetworkVisualization, VDClinicalGapDetectionDashboard, and inline content for procedure-specific tabs.
| **MISSING** | **Risk Heatmap** | **PatientRiskHeatmap** (shared) | **Not imported** |
| **MISSING** | **Care Network** | **CareTeamNetworkGraph** (shared) | **Not imported** |
| **MISSING** | **Automated Reports** | **AutomatedReportingSystem** | **Not imported** |

## VD Care Team — ValvularCareTeamView.tsx
Has valve-specific tabs with clinical intelligence tools (ValvePhenotypeClassification, ValveTherapyContraindicationChecker, ValveRiskScoreCalculator, etc.). VDClinicalGapDetectionDashboard rendered.

---

# SECTION D: PIPELINE VISIBILITY

| Pipeline | Component | In Active View? | Rendering? | Issue |
|----------|-----------|----------------|------------|-------|
| **HF Advanced Therapy Pipeline** | HFAdvancedTherapyPipeline (inline in serviceLineConfig) | **NO** | **NO** | Defined only in dead config; uses HF_CLINICAL_GAPS, estimateINTERMACS — rich pipeline with CardioMEMS, RPM, Barostim, LVAD, palliative care funnels. COMPLETELY INVISIBLE. |
| **EP Device & Ablation Pipeline** | Referenced in EP serviceLineConfig inline | **NO** | **NO** | Config-only pipeline sections |
| **CAD Intervention Pipeline** | Referenced in CAD serviceLineConfig inline | **NO** | **NO** | Config-only |
| **PV Vascular Pipeline** | Referenced in PV serviceLineConfig inline | **NO** | **NO** | Config-only |
| **SH TAVR Pipeline** | Referenced in SH serviceLineConfig inline | **NO** | **NO** | Config-only |

**Pipeline Velocity Metrics**: Defined in all 6 serviceLineConfig files as inline JSX. NONE render because configs are dead code.

**Quarterly Forecast Bar**: The `RevenuePipelineCard` in Executive views renders quarterly forecast data (ACTIVE in all 6 modules). But the detailed pipeline funnels in serviceLineConfig are dead.

---

# SECTION E: EXECUTIVE CARDS

| Card | HF | EP | CAD | SH | PV | VD |
|------|----|----|-----|----|----|----|
| **GapIntelligenceCard** | ACTIVE | ACTIVE | ACTIVE | ACTIVE | ACTIVE | ACTIVE |
| **PredictiveMetricsBanner** | ACTIVE | ACTIVE | ACTIVE | ACTIVE | ACTIVE | ACTIVE |
| **RevenuePipelineCard** | ACTIVE | ACTIVE | ACTIVE | ACTIVE | ACTIVE | ACTIVE |
| **RevenueAtRiskCard** | ACTIVE | ACTIVE | ACTIVE | ACTIVE | ACTIVE | ACTIVE |
| **TrajectoryTrendsCard** | ACTIVE | ACTIVE | ACTIVE | ACTIVE | ACTIVE | ACTIVE |

All 5 forward-looking cards are imported and rendered in all 6 Executive views. No issues.

---

# SECTION F: CALCULATOR WIRING

## Clinical Calculators (`src/utils/clinicalCalculators.ts`) — 13 functions

| # | Function | Used In | Status |
|---|----------|---------|--------|
| 1 | `computeSTOPBANG` | HF ClinicalGapDetectionDashboard | **ACTIVE** |
| 2 | `computeDANISHTier` | HF ClinicalGapDetectionDashboard | **ACTIVE** |
| 3 | `classifyLVOT` | HF ClinicalGapDetectionDashboard | **ACTIVE** |
| 4 | `computeKCCQTrend` | HF ClinicalGapDetectionDashboard | **ACTIVE** |
| 5 | `computeQTcRisk` | EP ClinicalGapDetectionDashboard | **ACTIVE** |
| 6 | `computeCHA2DS2VASc` | EP ClinicalGapDetectionDashboard | **ACTIVE** |
| 7 | `estimatePVCBurden` | EP ClinicalGapDetectionDashboard | **ACTIVE** |
| 8 | `computeHERDOO2` | PV ClinicalGapDetectionDashboard | **ACTIVE** |
| 9 | `classifyASSeverity` | SH ClinicalGapDetectionDashboard | **ACTIVE** |
| 10 | `computeSAQTrend` | CAD ClinicalGapDetectionDashboard | **ACTIVE** |
| 11 | `estimateSYNTAX` | CAD ClinicalGapDetectionDashboard + CAD serviceLineConfig (dead) | **ACTIVE** |
| 12 | `estimateINTERMACS` | HF serviceLineConfig ONLY (dead) | **CONFIG-ONLY — DEAD** |
| 13 | `computeH2FPEF` | NOT imported from utils (HF gap dashboard defines its OWN local version) | **DEAD** (utils version unused; local copy in HF gap dashboard is active) |

**Summary: 11/13 ACTIVE, 1 CONFIG-ONLY, 1 DEAD (shadowed by local copy)**

## Predictive Calculators (`src/utils/predictiveCalculators.ts`) — 14 functions

| # | Function | Used In | Status |
|---|----------|---------|--------|
| 1 | `computeTrajectory` | All 6 ClinicalGapDetectionDashboards | **ACTIVE** |
| 2 | `computeTimeHorizon` | All 6 ClinicalGapDetectionDashboards | **ACTIVE** |
| 3 | `predictThresholdDate` | HF ClinicalGapDetectionDashboard | **ACTIVE** |
| 4 | `estimateSVGFailureProbability` | CAD ClinicalGapDetectionDashboard | **ACTIVE** |
| 5 | `projectASProgression` | SH + VD ClinicalGapDetectionDashboards | **ACTIVE** |
| 6 | `projectBAVProgression` | HF + SH + VD ClinicalGapDetectionDashboards | **ACTIVE** |
| 7 | `computeKCCQHospitalizationRisk` | HF ClinicalGapDetectionDashboard | **ACTIVE** |
| 8 | `computeRevenueAtRisk` | HF + EP + CAD ClinicalGapDetectionDashboards | **ACTIVE** |
| 9 | `formatDollar` | All 6 ClinicalGapDetectionDashboards + 6 serviceLineConfigs (dead) | **ACTIVE** |
| 10 | `trajectoryDisplay` | All 6 ClinicalGapDetectionDashboards | **ACTIVE** |
| 11 | `timeHorizonDisplay` | All 6 ClinicalGapDetectionDashboards | **ACTIVE** |
| 12 | `computeTrajectoryDistribution` | **NOWHERE** (imported as type only in HF) | **DEAD** |
| 13 | `computePipelineForecast` | **NOWHERE** | **DEAD** |
| 14 | `computeDeferralImpact` | **NOWHERE** | **DEAD** |

**Summary: 11/14 ACTIVE, 3 DEAD**

---

# SECTION G: PRO INSTRUMENTS

| Component | File | In Active View? | Tab Defined? | Rendering? | Issue |
|-----------|------|----------------|-------------|------------|-------|
| **KCCQOutcomesPanel** | `src/ui/heartFailure/components/service-line/KCCQOutcomesPanel.tsx` | **NO** | **NO** | **NO** | Fully built component with KCCQ trends, domain scores, distribution charts — imported only in dead HF serviceLineConfig under 'pro-outcomes' tab |
| **SAQOutcomesPanel** | `src/ui/coronaryIntervention/components/service-line/SAQOutcomesPanel.tsx` | **NO** | **NO** | **NO** | Fully built component with SAQ outcome tracking — imported only in dead CAD serviceLineConfig under 'pro-outcomes' tab |
| **KCCQ in HF Executive** | Inline in ExecutiveView.tsx | **YES** | N/A (inline card) | **YES** | Hardcoded "Patient-Reported Outcomes" summary card renders in HF Executive — but this is NOT the full KCCQOutcomesPanel |
| **SAQ in CAD Executive** | Inline in CoronaryExecutiveView.tsx | **YES** | N/A (inline card) | **YES** | Hardcoded SAQ summary card renders in CAD Executive — but this is NOT the full SAQOutcomesPanel |
| **KCCQ trend badges in Care Team** | Part of ClinicalGapDetectionDashboard | **YES** | N/A | **YES** | KCCQ trends render inside gap cards via `computeKCCQTrend` — active |

---

# SECTION H: PRIORITY FIX LIST

## TIER 1 — Highest Impact (Fully built components, just need a tab added)

| Priority | Component | Where to Wire | Impact |
|----------|-----------|---------------|--------|
| **1** | **KCCQOutcomesPanel** | Add 'pro-outcomes' tab to HF ServiceLineView.tsx | Full KCCQ outcomes dashboard with domain scores, trends, distribution — highest clinical value PRO instrument |
| **2** | **SAQOutcomesPanel** | Add 'pro-outcomes' tab to CAD CoronaryServiceLineView.tsx | SAQ outcome tracking for coronary patients — key quality measure |
| **3** | **SHProviderScorecard** | Add 'providers' tab to SH StructuralServiceLineView.tsx | 583-line provider performance component for structural heart — fully built |
| **4** | **HFAdvancedTherapyPipeline** | Extract from HF serviceLineConfig, add 'pipeline' tab to HF ServiceLineView.tsx | CardioMEMS/RPM/Barostim/LVAD pipeline funnel with patient-level drill-down — uses estimateINTERMACS, HF_CLINICAL_GAPS |
| **5** | **EPRealTimeHospitalAlerts** | Add to EP EPCareTeamView.tsx dashboard mode or as new tab | Real-time hospital alerts for EP care team |
| **6** | **SHRealTimeHospitalAlerts** | Add to SH StructuralCareTeamView.tsx dashboard mode or as new tab | Real-time hospital alerts for SH care team |

## TIER 2 — Medium Impact (Built components, need tabs + may need data)

| Priority | Component | Where to Wire | Impact |
|----------|-----------|---------------|--------|
| **7** | **PhenotypeDetectionChart** | Add 'phenotype-chart' tab to HF ServiceLineView.tsx | Visual phenotype detection analytics for HF |
| **8** | **EPPhenotypeDetectionChart** | Replace inline placeholder at 'phenotype-chart' tab in EP EPServiceLineView.tsx | EP currently has an inline placeholder — real component exists |
| **9** | **SHPhenotypeDetectionChart** | Add 'phenotype-chart' tab to SH StructuralServiceLineView.tsx | SH phenotype detection analytics |
| **10** | **EPOutcomesTrends** | Add 'outcomes-trends' tab to EP EPServiceLineView.tsx | EP outcomes trend analysis |
| **11** | **EPRiskStratification** | Add to EP EPCareTeamView.tsx | EP risk stratification tool |
| **12** | **AutomatedReportingSystem** | Add 'reporting' tab to CAD, SH, VD Service Line views (already has inline "Reporting" tabs with placeholder content) | Shared reporting system — only HF, EP, PV Service Line views actually import it |
| **13** | **PatientRiskHeatmap** | Add to CAD, SH, VD Service Line views | Interactive risk visualization — only HF, EP, PV have it |
| **14** | **CareTeamNetworkGraph** | Add to CAD, SH, VD Service Line views | Provider relationship network — only HF, EP, PV have it |

## TIER 3 — Shared Risk Calculators (Built, need wiring into clinical intel tabs)

| Priority | Component | Where to Wire | Impact |
|----------|-----------|---------------|--------|
| **15** | **CRTICDEligibilityCalculator** | Add to HF and/or EP clinical intelligence tabs | CRT/ICD eligibility tool — fully built |
| **16** | **HASBLEDCalculator** | Add to SH clinical intelligence tab | HAS-BLED bleeding risk — important for valve patients on anticoagulation |
| **17** | **WIFIClassificationCalculator** | Add to PV clinical intelligence tab | WIfI classification — critical for limb salvage decision-making |
| **18** | **STSRiskCalculator** (shared) | Add to VD clinical intelligence tab | STS risk calculator for valvular surgery |

## TIER 4 — Orphaned Feature Modules (Built but never integrated anywhere)

| Priority | Component(s) | Potential Destination | Impact |
|----------|-------------|----------------------|--------|
| **19** | **CrossReferralEngine + ReferralPathwayCard + ReferralWorkflow** | New cross-referral section or Executive views | Cross-module patient referral tracking system — 3 interconnected components |
| **20** | **PopulationOverviewDashboard + PatientRiskStratification** | New population health view or Executive views | Population-level analytics — 2 components |
| **21** | **TherapyGapDashboard + DeviceUnderutilizationPanel + GDMTOptimizationTracker** | HF or shared therapy gap section | Therapy gap analysis suite — 3 components |
| **22** | **AmyloidosisScreener + PhenotypeScreeningPanel + PhenotypeDetailModal** | HF clinical intelligence or specialty phenotypes | Rare disease screening tools — 3 components |
| **23** | **MAGGICCalculator, FRAMINGHAMHFCalculator, ORBITBleedingCalculator, WellsPECalculator, INTERMACSCalculator, GRACEScoreCalculator (shared), CHA2DS2VAScCalculator (shared)** | Clinical intelligence tabs across modules | 7 shared risk calculators — fully built, never wired |
| **24** | **computePipelineForecast, computeDeferralImpact, computeTrajectoryDistribution** | Pipeline or Executive views | 3 predictive utility functions — defined but never called |

---

# SUMMARY STATISTICS

| Category | Count |
|----------|-------|
| **Config-only components** (built, in dead config, never rendered) | 11 |
| **Orphaned components** (built, imported nowhere) | 21 |
| **Orphaned shared risk calculators** | 7 |
| **Dead utility functions** | 5 (1 clinical + 1 shadowed + 3 predictive) |
| **Missing shared component wiring** | 9 gaps (3 components × 3 modules each) |
| **Total invisible components** | **37 components + 5 functions** |
| **Total active components** | ~290+ |

### The 6 serviceLineConfig.tsx files collectively contain:
- ~800+ lines of pipeline UI code per file
- Pipeline velocity metrics for all modules
- PRO outcomes panels (KCCQ, SAQ)
- Phenotype detection charts
- Provider scorecards
- **ALL of this is dead code that never renders**
