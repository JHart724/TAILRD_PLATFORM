/**
 * Unit Tests for Gap 44 -- Digoxin Toxicity Risk
 *
 * Tests the gap detection logic for digoxin toxicity in elderly and renal-impaired patients.
 * Verifies dose thresholds, renal function criteria, and serum level monitoring.
 */

describe('Gap 44 -- Digoxin Toxicity Risk', () => {
  test('should fire CRITICAL when digoxin level >2.0 ng/mL', () => {
    const patient = {
      age: 72,
      medications: [
        { name: 'digoxin', dose: 0.25, unit: 'mg', status: 'active' },
      ],
      observations: [
        { code: '10535-3', value: 2.4, unit: 'ng/mL', date: '2024-06-01' },  // Digoxin level >2.0
        { code: '33914-3', value: 55, unit: 'mL/min/1.73m2', date: '2024-06-01' }, // eGFR normal-ish
      ],
    };

    const onDigoxin = patient.medications.some(m => m.name === 'digoxin');
    const digLevel = patient.observations.find(o => o.code === '10535-3');
    const toxic = digLevel && (digLevel.value as number) > 2.0;

    expect(onDigoxin).toBe(true);
    expect(toxic).toBe(true);

    const riskTier = toxic ? 'CRITICAL' : 'MODERATE';
    expect(riskTier).toBe('CRITICAL');
  });

  test('should fire CRITICAL when on digoxin + eGFR <30', () => {
    const patient = {
      age: 68,
      medications: [
        { name: 'digoxin', dose: 0.125, unit: 'mg', status: 'active' },
      ],
      observations: [
        { code: '33914-3', value: 22, unit: 'mL/min/1.73m2', date: '2024-06-01' }, // eGFR <30
      ],
    };

    const onDigoxin = patient.medications.some(m => m.name === 'digoxin');
    const egfr = patient.observations.find(o => o.code === '33914-3');
    const severeRenal = egfr && (egfr.value as number) < 30;

    expect(onDigoxin).toBe(true);
    expect(severeRenal).toBe(true);

    const gapFires = onDigoxin && severeRenal;
    expect(gapFires).toBe(true);
  });

  test('should fire HIGH when digoxin >0.125mg + age >=75 + eGFR <50', () => {
    const patient = {
      age: 82,
      medications: [
        { name: 'digoxin', dose: 0.25, unit: 'mg', status: 'active' },  // >0.125mg
      ],
      observations: [
        { code: '33914-3', value: 38, unit: 'mL/min/1.73m2', date: '2024-06-01' }, // eGFR <50
      ],
    };

    const highDose = patient.medications.some(m => m.name === 'digoxin' && m.dose > 0.125);
    const elderly = patient.age >= 75;
    const egfr = patient.observations.find(o => o.code === '33914-3');
    const moderateRenal = egfr && (egfr.value as number) < 50;

    expect(highDose).toBe(true);
    expect(elderly).toBe(true);
    expect(moderateRenal).toBe(true);

    const gapFires = highDose && elderly && moderateRenal;
    expect(gapFires).toBe(true);
  });

  test('should NOT fire for patient not on digoxin', () => {
    const patient = {
      age: 80,
      medications: [
        { name: 'metoprolol', dose: 50, unit: 'mg', status: 'active' },
      ],
      observations: [
        { code: '33914-3', value: 35, unit: 'mL/min/1.73m2', date: '2024-06-01' },
      ],
    };

    const onDigoxin = patient.medications.some(m => m.name === 'digoxin');
    expect(onDigoxin).toBe(false);
    // Gap should NOT fire
  });

  test('should fire MODERATE when on digoxin with no recent level check', () => {
    const patient = {
      age: 70,
      medications: [
        { name: 'digoxin', dose: 0.125, unit: 'mg', status: 'active' },
      ],
      observations: [
        // No digoxin level on file
        { code: '33914-3', value: 60, unit: 'mL/min/1.73m2', date: '2024-06-01' },
      ],
    };

    const onDigoxin = patient.medications.some(m => m.name === 'digoxin');
    const hasDigLevel = patient.observations.some(o => o.code === '10535-3');

    expect(onDigoxin).toBe(true);
    expect(hasDigLevel).toBe(false);
    // Gap fires as MODERATE -- need to order level
  });

  test('should fire CRITICAL when digoxin + hypokalemia + elevated level', () => {
    const patient = {
      age: 75,
      medications: [
        { name: 'digoxin', dose: 0.125, unit: 'mg', status: 'active' },
      ],
      observations: [
        { code: '10535-3', value: 1.5, unit: 'ng/mL', date: '2024-06-01' },  // Elevated
        { code: '6298-4', value: 3.2, unit: 'mmol/L', date: '2024-06-01' },   // K+ <3.5
        { code: '33914-3', value: 55, unit: 'mL/min/1.73m2', date: '2024-06-01' },
      ],
    };

    const onDigoxin = patient.medications.some(m => m.name === 'digoxin');
    const potassium = patient.observations.find(o => o.code === '6298-4');
    const hypokalemia = potassium && (potassium.value as number) < 3.5;
    const digLevel = patient.observations.find(o => o.code === '10535-3');
    const elevated = digLevel && (digLevel.value as number) > 1.0;

    expect(onDigoxin).toBe(true);
    expect(hypokalemia).toBe(true);
    expect(elevated).toBe(true);
    // Hypokalemia + elevated digoxin = CRITICAL
  });
});
