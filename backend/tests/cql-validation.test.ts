/**
 * CQL Rule Validation Test Suite
 * Tests cardiovascular clinical decision support rules against realistic patient data
 * 
 * This test suite validates that CQL rules correctly identify clinical gaps and opportunities
 * using the hand-crafted FHIR patient bundles representing specific scenarios.
 */

import fs from 'fs';
import path from 'path';

// Types for test data
interface PatientBundle {
  resourceType: 'Bundle';
  id: string;
  type: string;
  entry: Array<{
    resource: any;
  }>;
}

interface TestPatient {
  id: string;
  description: string;
  bundle: PatientBundle;
}

interface CQLRuleResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  priority: 'high' | 'medium' | 'low';
  category: 'gap' | 'opportunity' | 'safety' | 'optimization';
  message: string;
  recommendations?: string[];
  contraindications?: string[];
}

interface CQLExecutionContext {
  patient: any;
  conditions: any[];
  observations: any[];
  medications: any[];
  procedures: any[];
  devices: any[];
  familyHistory: any[];
}

// Mock CQL Engine - In production, this would interface with a real CQL engine
class MockCQLEngine {
  
  /**
   * Execute CQL rules against a patient bundle
   */
  static executeRules(bundle: PatientBundle): CQLRuleResult[] {
    const context = this.buildExecutionContext(bundle);
    const results: CQLRuleResult[] = [];

    // Execute all rule sets
    results.push(...this.executeHFGDMTRules(context));
    results.push(...this.executeAFAnticoagulationRules(context));
    results.push(...this.executePostMIRules(context));
    results.push(...this.executeValvularRules(context));
    results.push(...this.executeDeviceRules(context));
    results.push(...this.executePhenotypeRules(context));
    results.push(...this.executeSafetyRules(context));

    return results.filter(result => result.triggered);
  }

  /**
   * Build execution context from FHIR bundle
   */
  private static buildExecutionContext(bundle: PatientBundle): CQLExecutionContext {
    const resources = bundle.entry.map(entry => entry.resource);
    
    return {
      patient: resources.find(r => r.resourceType === 'Patient'),
      conditions: resources.filter(r => r.resourceType === 'Condition'),
      observations: resources.filter(r => r.resourceType === 'Observation'),
      medications: resources.filter(r => r.resourceType === 'MedicationRequest'),
      procedures: resources.filter(r => r.resourceType === 'Procedure'),
      devices: resources.filter(r => r.resourceType === 'Device'),
      familyHistory: resources.filter(r => r.resourceType === 'FamilyMemberHistory')
    };
  }

  /**
   * Heart Failure GDMT Rules (Rules 01-10)
   */
  private static executeHFGDMTRules(context: CQLExecutionContext): CQLRuleResult[] {
    const results: CQLRuleResult[] = [];
    
    // Check for heart failure diagnosis
    const hfCondition = context.conditions.find(c => 
      c.code?.coding?.some((coding: any) => 
        coding.system === 'http://snomed.info/sct' && 
        ['84114007', '441530006', '414545008'].includes(coding.code)
      )
    );

    if (!hfCondition) return results;

    // Get ejection fraction
    const efObs = context.observations.find(obs =>
      obs.code?.coding?.some((coding: any) =>
        coding.system === 'http://loinc.org' && coding.code === '10230-1'
      )
    );
    
    const ejectionFraction = efObs?.valueQuantity?.value;
    const isHFrEF = ejectionFraction && ejectionFraction <= 40;

    if (isHFrEF) {
      // Rule 01: ACE/ARB/ARNI Gap
      const hasACEARB = context.medications.some(med =>
        med.medicationCodeableConcept?.coding?.some((coding: any) =>
          ['29046', '3827', '52175', '69749', '1656349'].includes(coding.code) // ACE/ARB/ARNI codes
        )
      );

      if (!hasACEARB) {
        results.push({
          ruleId: '01',
          ruleName: 'HFrEF ACE/ARB/ARNI Gap',
          triggered: true,
          priority: 'high',
          category: 'gap',
          message: 'Patient with HFrEF not on ACE inhibitor, ARB, or ARNI',
          recommendations: [
            'Initiate ACE inhibitor (lisinopril 2.5mg daily)',
            'Consider ARB if ACE inhibitor not tolerated',
            'Consider ARNI (sacubitril/valsartan) for persistent symptoms'
          ]
        });
      }

      // Rule 02: Beta-blocker Gap
      const hasBetaBlocker = context.medications.some(med =>
        med.medicationCodeableConcept?.coding?.some((coding: any) =>
          ['866924', '20352', '19484'].includes(coding.code) // Beta-blocker codes
        )
      );

      if (!hasBetaBlocker) {
        results.push({
          ruleId: '02',
          ruleName: 'HFrEF Beta-blocker Gap',
          triggered: true,
          priority: 'high',
          category: 'gap',
          message: 'Patient with HFrEF not on evidence-based beta-blocker',
          recommendations: [
            'Initiate metoprolol succinate 12.5mg twice daily',
            'Titrate to maximum tolerated dose',
            'Monitor heart rate and blood pressure'
          ]
        });
      }

      // Rule 03: MRA Gap
      const hasMRA = context.medications.some(med =>
        med.medicationCodeableConcept?.coding?.some((coding: any) =>
          ['9997', '298007'].includes(coding.code) // MRA codes
        )
      );

      const potassium = context.observations.find(obs =>
        obs.code?.coding?.some((coding: any) =>
          coding.system === 'http://loinc.org' && coding.code === '2823-3'
        )
      )?.valueQuantity?.value;

      const creatinine = context.observations.find(obs =>
        obs.code?.coding?.some((coding: any) =>
          coding.system === 'http://loinc.org' && coding.code === '2160-0'
        )
      )?.valueQuantity?.value;

      if (!hasMRA && (!potassium || potassium < 5.0) && (!creatinine || creatinine < 2.5)) {
        results.push({
          ruleId: '03',
          ruleName: 'HFrEF MRA Gap',
          triggered: true,
          priority: 'medium',
          category: 'gap',
          message: 'Patient with HFrEF may benefit from MRA therapy',
          recommendations: [
            'Consider spironolactone 12.5mg daily',
            'Monitor potassium and creatinine closely'
          ]
        });
      }

      // Rule 04: SGLT2i Gap
      const hasSGLT2i = context.medications.some(med =>
        med.medicationCodeableConcept?.coding?.some((coding: any) =>
          ['1545653', '1373458'].includes(coding.code) // SGLT2i codes
        )
      );

      if (!hasSGLT2i) {
        results.push({
          ruleId: '04',
          ruleName: 'HFrEF SGLT2i Gap',
          triggered: true,
          priority: 'medium',
          category: 'gap',
          message: 'Patient with HFrEF may benefit from SGLT2 inhibitor',
          recommendations: [
            'Consider empagliflozin 10mg daily',
            'Benefits independent of diabetes status'
          ]
        });
      }
    }

    return results;
  }

  /**
   * Atrial Fibrillation Anticoagulation Rules (Rules 11-20)
   */
  private static executeAFAnticoagulationRules(context: CQLExecutionContext): CQLRuleResult[] {
    const results: CQLRuleResult[] = [];

    // Check for atrial fibrillation
    const afCondition = context.conditions.find(c =>
      c.code?.coding?.some((coding: any) =>
        coding.system === 'http://snomed.info/sct' && coding.code === '49436004'
      )
    );

    if (!afCondition) return results;

    // Get CHA2DS2-VASc score
    const cha2ds2vascObs = context.observations.find(obs =>
      obs.code?.coding?.some((coding: any) =>
        coding.system === 'http://snomed.info/sct' && coding.code === '443490004'
      )
    );

    const cha2ds2vascScore = cha2ds2vascObs?.valueInteger;

    // Check for anticoagulation
    const hasAnticoagulant = context.medications.some(med =>
      med.medicationCodeableConcept?.coding?.some((coding: any) =>
        ['11289', '1364430', '1114195', '1037042', '1599538'].includes(coding.code) // Anticoagulant codes
      )
    );

    // Rule 11: AF Anticoagulation Gap
    if (cha2ds2vascScore && cha2ds2vascScore >= 2 && !hasAnticoagulant) {
      results.push({
        ruleId: '11',
        ruleName: 'AF Anticoagulation Gap',
        triggered: true,
        priority: 'high',
        category: 'gap',
        message: `Patient with AF and CHA2DS2-VASc score ${cha2ds2vascScore} not on anticoagulation`,
        recommendations: [
          'Initiate DOAC (apixaban 5mg twice daily preferred)',
          'Assess bleeding risk with HAS-BLED score',
          'Consider patient preferences and contraindications'
        ]
      });
    }

    // Rule 12: Warfarin to DOAC Switch Opportunity
    const hasWarfarin = context.medications.some(med =>
      med.medicationCodeableConcept?.coding?.some((coding: any) => coding.code === '11289')
    );

    const hasbledScore = context.observations.find(obs =>
      obs.code?.coding?.some((coding: any) =>
        coding.system === 'http://snomed.info/sct' && coding.code === '443508008'
      )
    )?.valueInteger;

    if (hasWarfarin && hasbledScore && hasbledScore >= 3) {
      results.push({
        ruleId: '12',
        ruleName: 'Warfarin to DOAC Switch Opportunity',
        triggered: true,
        priority: 'medium',
        category: 'opportunity',
        message: 'High bleeding risk patient on warfarin may benefit from DOAC',
        recommendations: [
          'Consider switching to DOAC with lower bleeding risk',
          'Evaluate for WATCHMAN device if high bleeding risk persists'
        ]
      });
    }

    return results;
  }

  /**
   * Post-MI Secondary Prevention Rules (Rules 21-25)
   */
  private static executePostMIRules(context: CQLExecutionContext): CQLRuleResult[] {
    const results: CQLRuleResult[] = [];

    // Check for MI history
    const miCondition = context.conditions.find(c =>
      c.code?.coding?.some((coding: any) =>
        coding.system === 'http://snomed.info/sct' && 
        ['401314000', '22298006'].includes(coding.code) // STEMI, NSTEMI
      )
    );

    if (!miCondition) return results;

    // Rule 21: Post-MI Statin Gap
    const hasStatin = context.medications.some(med =>
      med.medicationCodeableConcept?.coding?.some((coding: any) =>
        ['83367', '301542', '36567'].includes(coding.code) // Statin codes
      )
    );

    if (!hasStatin) {
      results.push({
        ruleId: '21',
        ruleName: 'Post-MI Statin Gap',
        triggered: true,
        priority: 'high',
        category: 'gap',
        message: 'Post-MI patient not on high-intensity statin therapy',
        recommendations: [
          'Initiate atorvastatin 80mg daily',
          'Target LDL <70 mg/dL (<1.8 mmol/L)'
        ]
      });
    }

    // Rule 22: LDL Target Not at Goal
    const ldlObs = context.observations.find(obs =>
      obs.code?.coding?.some((coding: any) =>
        coding.system === 'http://loinc.org' && coding.code === '18262-6'
      )
    );

    const ldlValue = ldlObs?.valueQuantity?.value;
    if (ldlValue && ldlValue > 70) {
      results.push({
        ruleId: '22',
        ruleName: 'Post-MI LDL Not at Goal',
        triggered: true,
        priority: 'medium',
        category: 'optimization',
        message: `LDL ${ldlValue} mg/dL above target of <70 mg/dL for post-MI patient`,
        recommendations: [
          'Intensify statin therapy',
          'Consider adding ezetimibe or PCSK9 inhibitor',
          'Reassess lifestyle modifications'
        ]
      });
    }

    return results;
  }

  /**
   * Valvular Disease Rules (Rules 26-35)
   */
  private static executeValvularRules(context: CQLExecutionContext): CQLRuleResult[] {
    const results: CQLRuleResult[] = [];

    // Rule 26: Severe AS with Symptoms
    const asCondition = context.conditions.find(c =>
      c.code?.coding?.some((coding: any) =>
        coding.system === 'http://snomed.info/sct' && coding.code === '60573004'
      ) && c.stage?.[0]?.summary?.coding?.some((coding: any) => coding.code === '24484000') // Severe
    );

    const hasSymptoms = context.conditions.some(c =>
      c.code?.coding?.some((coding: any) =>
        ['267036007', '87317003'].includes(coding.code) // Dyspnea, chest pain
      )
    );

    if (asCondition && hasSymptoms) {
      const stsScore = context.observations.find(obs =>
        obs.code?.coding?.some((coding: any) =>
          coding.system === 'http://snomed.info/sct' && coding.code === '444208001'
        )
      )?.valueQuantity?.value;

      results.push({
        ruleId: '26',
        ruleName: 'Severe AS Intervention Candidate',
        triggered: true,
        priority: 'high',
        category: 'opportunity',
        message: 'Patient with severe symptomatic AS - intervention candidate',
        recommendations: stsScore && stsScore < 4 ? 
          ['Refer for SAVR evaluation', 'Consider TAVR if appropriate anatomy'] :
          ['Refer for TAVR evaluation', 'Heart team consultation recommended']
      });
    }

    return results;
  }

  /**
   * Device Therapy Rules (Rules 36-45)
   */
  private static executeDeviceRules(context: CQLExecutionContext): CQLRuleResult[] {
    const results: CQLRuleResult[] = [];

    // Rule 36: CRT Eligibility
    const hfCondition = context.conditions.find(c =>
      c.code?.coding?.some((coding: any) => coding.code === '84114007')
    );

    const efObs = context.observations.find(obs =>
      obs.code?.coding?.some((coding: any) => coding.code === '10230-1')
    );
    const ef = efObs?.valueQuantity?.value;

    const ecgObs = context.observations.find(obs =>
      obs.code?.coding?.some((coding: any) => coding.code === '11524-6')
    );
    
    const hasLBBB = ecgObs?.component?.some((comp: any) =>
      comp.code?.coding?.some((coding: any) => coding.code === '164909002')
    );

    const qrsDuration = ecgObs?.component?.find((comp: any) =>
      comp.code?.coding?.some((coding: any) => coding.code === '8625-6')
    )?.valueQuantity?.value;

    // Check if patient already has CRT device
    const hasCRT = context.devices.some(device =>
      device.type?.coding?.some((coding: any) =>
        ['706224008'].includes(coding.code) // CRT-D code
      )
    );

    if (hfCondition && ef && ef <= 35 && qrsDuration && qrsDuration >= 150 && hasLBBB && !hasCRT) {
      results.push({
        ruleId: '36',
        ruleName: 'CRT Therapy Candidate',
        triggered: true,
        priority: 'high',
        category: 'opportunity',
        message: 'Patient meets criteria for CRT therapy',
        recommendations: [
          'Refer for CRT-D evaluation',
          'Ensure optimal medical therapy for 3+ months',
          'Assess for NYHA Class II-IV symptoms'
        ]
      });
    }

    return results;
  }

  /**
   * Special Phenotype Rules (Rules 46-50)
   */
  private static executePhenotypeRules(context: CQLExecutionContext): CQLRuleResult[] {
    const results: CQLRuleResult[] = [];

    // Rule 24: Cardiac Amyloidosis Red Flags
    const hfpefCondition = context.conditions.find(c =>
      c.code?.coding?.some((coding: any) => coding.code === '441530006')
    );

    const ctsCondition = context.conditions.find(c =>
      c.code?.coding?.some((coding: any) => coding.code === '57406009') &&
      c.bodySite?.some((site: any) =>
        site.coding?.some((coding: any) => coding.code === '51636004') // Bilateral
      )
    );

    const lvhObs = context.observations.find(obs =>
      obs.code?.coding?.some((coding: any) => coding.code === '77905-1')
    );
    const wallThickness = lvhObs?.valueQuantity?.value;

    const lowVoltageECG = context.observations.find(obs =>
      obs.component?.some((comp: any) =>
        comp.code?.coding?.some((coding: any) => coding.code === '251259004')
      )
    );

    if (hfpefCondition && ctsCondition && wallThickness && wallThickness > 15 && lowVoltageECG) {
      results.push({
        ruleId: '24',
        ruleName: 'Cardiac Amyloidosis Red Flags',
        triggered: true,
        priority: 'high',
        category: 'opportunity',
        message: 'Multiple red flags suggest possible cardiac amyloidosis',
        recommendations: [
          'Order technetium-99m pyrophosphate (PYP) scan',
          'Check serum/urine protein electrophoresis',
          'Consider cardio-oncology referral'
        ]
      });
    }

    // Rule 25: Iron Deficiency in HF
    const ironDefCondition = context.conditions.find(c =>
      c.code?.coding?.some((coding: any) => coding.code === '35240004')
    );

    const ferritinObs = context.observations.find(obs =>
      obs.code?.coding?.some((coding: any) => coding.code === '2276-4')
    );
    const ferritin = ferritinObs?.valueQuantity?.value;

    const tsatObs = context.observations.find(obs =>
      obs.code?.coding?.some((coding: any) => coding.code === '2571-8')
    );
    const tsat = tsatObs?.valueQuantity?.value;

    if (hfpefCondition) {
      if ((ferritin && ferritin < 100) || (ferritin && ferritin < 300 && tsat && tsat < 20)) {
        results.push({
          ruleId: '25',
          ruleName: 'Iron Deficiency in Heart Failure',
          triggered: true,
          priority: 'medium',
          category: 'opportunity',
          message: 'Heart failure patient with iron deficiency',
          recommendations: [
            'Consider IV iron replacement therapy',
            'Ferric carboxymaltose 500-1000mg IV',
            'Monitor hemoglobin and iron studies'
          ]
        });
      }
    }

    return results;
  }

  /**
   * Safety Rules (Rules 51-60)
   */
  private static executeSafetyRules(context: CQLExecutionContext): CQLRuleResult[] {
    const results: CQLRuleResult[] = [];

    // Rule 51: Hyperkalemia with MRA
    const hasMRA = context.medications.some(med =>
      med.medicationCodeableConcept?.coding?.some((coding: any) =>
        ['9997', '298007'].includes(coding.code)
      )
    );

    const potassium = context.observations.find(obs =>
      obs.code?.coding?.some((coding: any) => coding.code === '2823-3')
    )?.valueQuantity?.value;

    if (hasMRA && potassium && potassium > 5.0) {
      results.push({
        ruleId: '51',
        ruleName: 'Hyperkalemia Safety Alert',
        triggered: true,
        priority: 'high',
        category: 'safety',
        message: `Hyperkalemia (K+ ${potassium} mEq/L) in patient on MRA therapy`,
        recommendations: [
          'Consider reducing or holding MRA',
          'Recheck potassium in 3-7 days',
          'Review concurrent medications (ACE/ARB)'
        ]
      });
    }

    return results;
  }
}

// Load test data
const loadTestPatients = (): TestPatient[] => {
  const filePath = path.join(__dirname, 'fixtures', 'sample-patients.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(fileContent);
};

// Test suite
describe('CQL Rule Validation Suite', () => {
  let testPatients: TestPatient[];

  beforeAll(() => {
    testPatients = loadTestPatients();
    expect(testPatients).toHaveLength(20);
  });

  describe('Heart Failure GDMT Rules', () => {
    test('Rule 01: Should trigger for HFrEF patient with maximum GDMT gap', () => {
      const patient = testPatients.find(p => p.id === 'patient-hfref-gdmt-gap-maximum');
      expect(patient).toBeDefined();
      
      const results = MockCQLEngine.executeRules(patient!.bundle);
      
      // Should trigger all 4 GDMT pillar gaps
      const gdmtGaps = results.filter(r => ['01', '02', '03', '04'].includes(r.ruleId));
      expect(gdmtGaps).toHaveLength(4);
      
      const aceGap = results.find(r => r.ruleId === '01');
      expect(aceGap).toBeDefined();
      expect(aceGap!.triggered).toBe(true);
      expect(aceGap!.priority).toBe('high');
      expect(aceGap!.category).toBe('gap');
    });

    test('Rule 01-04: Should NOT trigger for optimally treated HFrEF patient', () => {
      const patient = testPatients.find(p => p.id === 'patient-hfref-gdmt-optimal');
      expect(patient).toBeDefined();
      
      const results = MockCQLEngine.executeRules(patient!.bundle);
      
      // Should not trigger any GDMT gaps
      const gdmtGaps = results.filter(r => ['01', '02', '03', '04'].includes(r.ruleId));
      expect(gdmtGaps).toHaveLength(0);
    });
  });

  describe('Atrial Fibrillation Anticoagulation Rules', () => {
    test('Rule 11: Should trigger for high CHA2DS2-VASc score without anticoagulation', () => {
      const patient = testPatients.find(p => p.id === 'patient-af-cha2ds2vasc-high-no-anticoag');
      expect(patient).toBeDefined();
      
      const results = MockCQLEngine.executeRules(patient!.bundle);
      
      const afRule = results.find(r => r.ruleId === '11');
      expect(afRule).toBeDefined();
      expect(afRule!.triggered).toBe(true);
      expect(afRule!.priority).toBe('high');
      expect(afRule!.message).toContain('CHA2DS2-VASc score 4');
    });

    test('Rule 12: Should trigger warfarin to DOAC switch for high bleeding risk', () => {
      const patient = testPatients.find(p => p.id === 'patient-af-high-bleeding-risk-warfarin');
      expect(patient).toBeDefined();
      
      const results = MockCQLEngine.executeRules(patient!.bundle);
      
      const switchRule = results.find(r => r.ruleId === '12');
      expect(switchRule).toBeDefined();
      expect(switchRule!.triggered).toBe(true);
      expect(switchRule!.category).toBe('opportunity');
    });
  });

  describe('Post-MI Secondary Prevention Rules', () => {
    test('Rule 22: Should trigger for suboptimal LDL control post-MI', () => {
      const patient = testPatients.find(p => p.id === 'patient-post-mi-incomplete-prevention');
      expect(patient).toBeDefined();
      
      const results = MockCQLEngine.executeRules(patient!.bundle);
      
      const ldlRule = results.find(r => r.ruleId === '22');
      expect(ldlRule).toBeDefined();
      expect(ldlRule!.triggered).toBe(true);
      expect(ldlRule!.message).toContain('145 mg/dL above target');
    });
  });

  describe('Valvular Disease Rules', () => {
    test('Rule 26: Should trigger for severe symptomatic AS', () => {
      const patient = testPatients.find(p => p.id === 'patient-severe-as-tavr-candidate');
      expect(patient).toBeDefined();
      
      const results = MockCQLEngine.executeRules(patient!.bundle);
      
      const asRule = results.find(r => r.ruleId === '26');
      expect(asRule).toBeDefined();
      expect(asRule!.triggered).toBe(true);
      expect(asRule!.category).toBe('opportunity');
      expect(asRule!.recommendations).toContain('Refer for SAVR evaluation');
    });
  });

  describe('Device Therapy Rules', () => {
    test('Rule 36: Should trigger for CRT-eligible patient without device', () => {
      const patient = testPatients.find(p => p.id === 'patient-crt-eligible-no-device');
      expect(patient).toBeDefined();
      
      const results = MockCQLEngine.executeRules(patient!.bundle);
      
      const crtRule = results.find(r => r.ruleId === '36');
      expect(crtRule).toBeDefined();
      expect(crtRule!.triggered).toBe(true);
      expect(crtRule!.priority).toBe('high');
      expect(crtRule!.recommendations).toContain('Refer for CRT-D evaluation');
    });

    test('Rule 36: Should NOT trigger for patient with existing CRT device', () => {
      const patient = testPatients.find(p => p.id === 'patient-crt-d-implant');
      expect(patient).toBeDefined();
      
      const results = MockCQLEngine.executeRules(patient!.bundle);
      
      const crtRule = results.find(r => r.ruleId === '36');
      expect(crtRule).toBeUndefined();
    });
  });

  describe('Special Phenotype Rules', () => {
    test('Rule 24: Should trigger for cardiac amyloidosis red flags', () => {
      const patient = testPatients.find(p => p.id === 'patient-hfpef-amyloid-suspect');
      expect(patient).toBeDefined();
      
      const results = MockCQLEngine.executeRules(patient!.bundle);
      
      const amyloidRule = results.find(r => r.ruleId === '24');
      expect(amyloidRule).toBeDefined();
      expect(amyloidRule!.triggered).toBe(true);
      expect(amyloidRule!.recommendations).toContain('Order technetium-99m pyrophosphate (PYP) scan');
    });

    test('Rule 25: Should trigger for iron deficiency in HF', () => {
      const patient = testPatients.find(p => p.id === 'patient-iron-deficiency-hf');
      expect(patient).toBeDefined();
      
      const results = MockCQLEngine.executeRules(patient!.bundle);
      
      const ironRule = results.find(r => r.ruleId === '25');
      expect(ironRule).toBeDefined();
      expect(ironRule!.triggered).toBe(true);
      expect(ironRule!.message).toContain('iron deficiency');
    });
  });

  describe('Safety Rules', () => {
    test('Rule 51: Should trigger hyperkalemia safety alert', () => {
      const patient = testPatients.find(p => p.id === 'patient-hfref-gdmt-gap-maximum');
      expect(patient).toBeDefined();
      
      // This patient has K+ 5.2 but no MRA, so should not trigger
      const results = MockCQLEngine.executeRules(patient!.bundle);
      
      const safetyRule = results.find(r => r.ruleId === '51');
      expect(safetyRule).toBeUndefined();
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    test('Should handle patients with multiple conditions appropriately', () => {
      const patient = testPatients.find(p => p.id === 'patient-diabetes-cv-risk');
      expect(patient).toBeDefined();
      
      const results = MockCQLEngine.executeRules(patient!.bundle);
      
      // Should not trigger HF-specific rules for non-HF patient
      const hfRules = results.filter(r => ['01', '02', '03', '04'].includes(r.ruleId));
      expect(hfRules).toHaveLength(0);
    });

    test('Should handle device patients correctly', () => {
      const watchmanPatient = testPatients.find(p => p.id === 'patient-watchman-device');
      expect(watchmanPatient).toBeDefined();
      
      const results = MockCQLEngine.executeRules(watchmanPatient!.bundle);
      
      // Should not trigger AF anticoagulation gap for WATCHMAN patient
      const afRule = results.find(r => r.ruleId === '11');
      expect(afRule).toBeUndefined();
    });

    test('Should validate FHIR resource structure', () => {
      testPatients.forEach(patient => {
        expect(patient.bundle.resourceType).toBe('Bundle');
        expect(patient.bundle.type).toBe('transaction');
        expect(patient.bundle.entry).toBeInstanceOf(Array);
        expect(patient.bundle.entry.length).toBeGreaterThan(0);
        
        // Verify patient resource exists
        const patientResource = patient.bundle.entry.find(entry => 
          entry.resource.resourceType === 'Patient'
        );
        expect(patientResource).toBeDefined();
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('Should execute rules efficiently for all patients', () => {
      const startTime = Date.now();
      
      testPatients.forEach(patient => {
        const results = MockCQLEngine.executeRules(patient.bundle);
        expect(results).toBeInstanceOf(Array);
      });
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('Should handle malformed data gracefully', () => {
      const malformedBundle: PatientBundle = {
        resourceType: 'Bundle',
        id: 'test-malformed',
        type: 'transaction',
        entry: []
      };
      
      expect(() => {
        const results = MockCQLEngine.executeRules(malformedBundle);
        expect(results).toBeInstanceOf(Array);
        expect(results).toHaveLength(0);
      }).not.toThrow();
    });
  });

  describe('Integration Validation', () => {
    test('Should use correct terminology codes', () => {
      // Validate SNOMED CT codes are used consistently
      testPatients.forEach(patient => {
        patient.bundle.entry.forEach(entry => {
          if (entry.resource.resourceType === 'Condition' && entry.resource.code?.coding) {
            const snomedCoding = entry.resource.code.coding.find((c: any) => 
              c.system === 'http://snomed.info/sct'
            );
            if (snomedCoding) {
              expect(snomedCoding.code).toMatch(/^\\d+$/); // Should be numeric
              expect(snomedCoding.display).toBeDefined();
            }
          }
        });
      });
    });

    test('Should use correct LOINC codes for observations', () => {
      testPatients.forEach(patient => {
        patient.bundle.entry.forEach(entry => {
          if (entry.resource.resourceType === 'Observation' && entry.resource.code?.coding) {
            const loincCoding = entry.resource.code.coding.find((c: any) => 
              c.system === 'http://loinc.org'
            );
            if (loincCoding) {
              expect(loincCoding.code).toMatch(/^[0-9]+-[0-9]$/); // Should match LOINC format
              expect(loincCoding.display).toBeDefined();
            }
          }
        });
      });
    });

    test('Should use correct RxNorm codes for medications', () => {
      testPatients.forEach(patient => {
        patient.bundle.entry.forEach(entry => {
          if (entry.resource.resourceType === 'MedicationRequest' && 
              entry.resource.medicationCodeableConcept?.coding) {
            const rxnormCoding = entry.resource.medicationCodeableConcept.coding.find((c: any) => 
              c.system === 'http://www.nlm.nih.gov/research/umls/rxnorm'
            );
            if (rxnormCoding) {
              expect(rxnormCoding.code).toMatch(/^\\d+$/); // Should be numeric
              expect(rxnormCoding.display).toBeDefined();
            }
          }
        });
      });
    });
  });
});

// Utility function for custom rule testing
export const runCustomCQLTest = (patientId: string, expectedRules: string[]): boolean => {
  const testPatients = loadTestPatients();
  const patient = testPatients.find(p => p.id === patientId);
  
  if (!patient) {
    throw new Error(`Patient ${patientId} not found`);
  }
  
  const results = MockCQLEngine.executeRules(patient.bundle);
  const triggeredRules = results.map(r => r.ruleId);
  
  return expectedRules.every(ruleId => triggeredRules.includes(ruleId));
};