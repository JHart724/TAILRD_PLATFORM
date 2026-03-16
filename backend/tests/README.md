# TAILRD Platform Test Data & CQL Validation Suite

This directory contains comprehensive cardiovascular test data and validation frameworks for the TAILRD Platform clinical decision support system.

## 🏗️ Components

### 1. Synthea Configuration (`~/tailrd-research/clinical-infrastructure/synthea-cv-config.json`)

**Purpose**: Generate realistic cardiovascular patient populations for large-scale testing

**Features**:
- **2,000 patients** with realistic demographic distributions
- **Comprehensive CV conditions**:
  - Heart failure (HFrEF, HFpEF, HFmrEF) with varying GDMT coverage
  - Atrial fibrillation with CHA2DS2-VASc scoring
  - Post-MI, post-PCI, post-CABG scenarios
  - Valvular disease (AS, MR) at various severities
  - Device patients (pacemaker, ICD, CRT, WATCHMAN, CardioMEMS)
  - Special phenotypes (amyloidosis, HCM, iron deficiency)
- **Realistic clinical data**: Labs, vitals, medications, ECG findings
- **Equity focus**: Diverse age, sex, and race distributions
- **FHIR R4 export** with proper terminology (SNOMED, LOINC, RxNorm)

**Usage**:
```bash
# Configure Synthea with our cardiovascular module
synthea -c ~/tailrd-research/clinical-infrastructure/synthea-cv-config.json -p 2000

# Export to FHIR R4 format
synthea --exporter.fhir.export=true --exporter.baseDirectory=./output
```

### 2. Hand-Crafted Test Patients (`tests/fixtures/sample-patients.json`)

**Purpose**: 20 precisely crafted FHIR R4 bundles for specific clinical scenarios

**Test Cases**:

| ID | Scenario | Expected CQL Rules |
|----|----------|-------------------|
| `patient-hfref-gdmt-gap-maximum` | HFrEF on 0/4 GDMT pillars | Rules 01-04 (all gaps) |
| `patient-hfref-gdmt-optimal` | HFrEF on optimal GDMT | No HF gaps |
| `patient-af-cha2ds2vasc-high-no-anticoag` | AF + CHA2DS2-VASc=4, no anticoag | Rule 11 (critical gap) |
| `patient-severe-as-tavr-candidate` | Severe AS + symptoms + low risk | Rule 26 (TAVR candidate) |
| `patient-hfpef-amyloid-suspect` | HFpEF + CTS + unexplained LVH | Rule 24 (amyloid red flags) |
| `patient-hcm-family-hx-scd` | HCM + family SCD history | ICD evaluation rule |
| `patient-post-mi-incomplete-prevention` | Post-MI with gaps | Rule 22 (LDL not at goal) |
| `patient-crt-eligible-no-device` | CRT criteria met, no device | Rule 36 (CRT candidate) |
| `patient-iron-deficiency-hf` | HF + ferritin <100 | Rule 25 (iron deficiency) |
| `patient-af-high-bleeding-risk-warfarin` | AF + HAS-BLED=4 + warfarin | Rule 12 (DOAC switch) |
| ... | 10 additional scenarios | Various rules |

**FHIR Resources per Bundle**:
- Patient (demographics)
- Conditions (diagnoses with proper staging)
- Observations (labs, vitals, echo, ECG)
- MedicationRequests (current prescriptions)
- Procedures (interventions, surgeries)
- Devices (when applicable)
- FamilyMemberHistory (genetic risk factors)

### 3. CQL Validation Test Suite (`tests/cql-validation.test.ts`)

**Purpose**: Automated unit testing framework for clinical decision support rules

**Features**:
- **60 CQL rules** organized by clinical domain:
  - Heart Failure GDMT (Rules 01-10)
  - AF Anticoagulation (Rules 11-20)  
  - Post-MI Prevention (Rules 21-25)
  - Valvular Disease (Rules 26-35)
  - Device Therapy (Rules 36-45)
  - Special Phenotypes (Rules 46-50)
  - Safety Rules (Rules 51-60)

- **Mock CQL Engine**: Simulates real CQL execution
- **Comprehensive Test Coverage**:
  - Positive cases (rules should trigger)
  - Negative cases (rules should not trigger)
  - Edge cases and complex scenarios
  - Performance and scalability tests
  - FHIR terminology validation

**Test Categories**:
- ✅ **Gap Identification**: Missing evidence-based therapies
- 🎯 **Optimization**: Suboptimal dosing or monitoring
- 🔍 **Opportunity**: Intervention candidates  
- ⚠️ **Safety**: Drug interactions, contraindications

## 🚀 Getting Started

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure Jest is configured
npm run test --version
```

### Running Tests
```bash
# Run all CQL validation tests
npm test cql-validation

# Run specific test suites
npm test -- --testNamePattern="Heart Failure GDMT"
npm test -- --testNamePattern="Atrial Fibrillation"

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Results Format
```typescript
interface CQLRuleResult {
  ruleId: string;           // "01", "24", etc.
  ruleName: string;         // Human-readable name
  triggered: boolean;       // Rule fired
  priority: 'high' | 'medium' | 'low';
  category: 'gap' | 'opportunity' | 'safety' | 'optimization';
  message: string;          // Clinical finding
  recommendations?: string[]; // Actionable next steps
  contraindications?: string[]; // Safety considerations
}
```

## 🧪 Example Usage

### Testing a Specific Patient Scenario
```typescript
import { runCustomCQLTest } from './cql-validation.test';

// Test that HFrEF patient with GDMT gaps triggers expected rules
const result = runCustomCQLTest(
  'patient-hfref-gdmt-gap-maximum', 
  ['01', '02', '03', '04'] // Expected ACE, BB, MRA, SGLT2i gaps
);
console.log(`Test passed: ${result}`);
```

### Adding New Test Scenarios
```typescript
// Add to sample-patients.json
{
  "id": "patient-new-scenario",
  "description": "Your clinical scenario",
  "bundle": {
    "resourceType": "Bundle",
    "type": "transaction",
    "entry": [
      // Your FHIR resources here
    ]
  }
}

// Add corresponding test
test('New scenario should trigger Rule XX', () => {
  const patient = testPatients.find(p => p.id === 'patient-new-scenario');
  const results = MockCQLEngine.executeRules(patient.bundle);
  
  expect(results.find(r => r.ruleId === 'XX')).toBeDefined();
});
```

## 📊 Validation Metrics

### Coverage Goals
- **Clinical Scenarios**: 20 hand-crafted + 2,000 synthetic
- **CQL Rules**: 60+ cardiovascular decision support rules  
- **FHIR Resources**: Complete patient clinical pictures
- **Terminology**: 100% proper SNOMED/LOINC/RxNorm coding
- **Edge Cases**: Contraindications, drug interactions, rare phenotypes

### Quality Assurance
- ✅ All test patients validate against FHIR R4 schema
- ✅ Terminology codes are clinically accurate  
- ✅ Clinical scenarios reflect real-world complexity
- ✅ Rules align with current evidence-based guidelines
- ✅ Performance testing for production scale

## 🎯 Clinical Decision Rules Tested

### High-Priority Gaps (Rules 01-25)
| Rule | Clinical Gap | Patient Population |
|------|--------------|-------------------|
| 01 | HFrEF without ACE/ARB/ARNI | ~25% of HF patients |
| 02 | HFrEF without beta-blocker | ~20% of HF patients |
| 11 | AF high-stroke-risk, no anticoag | ~35% of AF patients |
| 21 | Post-MI without high-intensity statin | ~30% of MI patients |
| 24 | Undiagnosed cardiac amyloidosis | ~13% of HFpEF patients |

### Device Opportunities (Rules 36-45)
- CRT candidates not referred
- ICD primary prevention gaps  
- TAVR/SAVR evaluation delays
- WATCHMAN consideration for bleeding-risk AF

### Safety Monitoring (Rules 51-60)
- Hyperkalemia with RAAS inhibitors
- QT prolongation monitoring
- Drug-drug interactions
- Renal function surveillance

## 🔗 Integration Points

### With TAILRD Platform
```typescript
// Import into main application
import { MockCQLEngine } from './tests/cql-validation.test';

// Execute rules against live patient data
const clinicalFindings = MockCQLEngine.executeRules(patientFHIRBundle);

// Display in UI dashboard
clinicalFindings.forEach(finding => {
  if (finding.priority === 'high') {
    showAlert(finding.message, finding.recommendations);
  }
});
```

### With EHR Systems
- **Redox Integration**: Map FHIR bundles to EHR data models
- **Epic MyChart**: Clinical decision support hooks
- **Cerner PowerChart**: Real-time rule execution

## 📈 Future Enhancements

### Planned Additions
- **Pediatric Cardiology**: Congenital heart disease scenarios
- **Heart Transplant**: Post-transplant monitoring rules  
- **Mechanical Support**: LVAD, ECMO, Impella scenarios
- **Interventional**: PCI, TAVR, MitraClip decision support
- **Electrophysiology**: Ablation, lead management rules

### AI/ML Integration
- **Risk Prediction**: HF readmission, mortality models
- **Phenotyping**: Automated rare disease detection
- **Optimization**: Personalized medication titration
- **Population Health**: Cohort-based interventions

---

## 📞 Support

For questions about the test data or validation framework:
- **Clinical Questions**: Contact cardiology team
- **Technical Issues**: Submit GitHub issue
- **FHIR/Terminology**: Reference HL7.org documentation

**Last Updated**: February 2026
**Version**: 1.0.0
**Maintainer**: TAILRD Platform Team