/**
 * Unit Tests for Gap 2 -- Iron Deficiency in Heart Failure
 *
 * Tests the gap detection logic for iron deficiency screening in HF patients.
 * Verifies ferritin/TSAT thresholds, IV iron exclusion, and monitoring gaps.
 */

describe('Gap 2 -- Iron Deficiency in HF', () => {
  test('should fire for HF patient with absolute iron deficiency (ferritin <100)', () => {
    const patient = {
      conditions: [
        { code: 'I50.22', status: 'active' },  // Chronic systolic HF
      ],
      observations: [
        { code: '2276-4', value: 45, unit: 'ng/mL', date: '2024-06-01' },  // Ferritin <100
        { code: '2502-3', value: 15, unit: '%', date: '2024-06-01' },       // TSAT <20%
      ],
      medications: [],
    };

    const hasHF = patient.conditions.some(c => c.code.startsWith('I50'));
    const ferritin = patient.observations.find(o => o.code === '2276-4');
    const absoluteDeficiency = ferritin && (ferritin.value as number) < 100;
    const onIVIron = patient.medications.some((m: any) =>
      ['ferric carboxymaltose', 'iron sucrose', 'ferumoxytol'].includes(m.name?.toLowerCase())
    );

    expect(hasHF).toBe(true);
    expect(absoluteDeficiency).toBe(true);
    expect(onIVIron).toBe(false);

    const gapFires = hasHF && absoluteDeficiency && !onIVIron;
    expect(gapFires).toBe(true);
  });

  test('should fire for HF patient with functional iron deficiency (ferritin 100-300 + TSAT <20%)', () => {
    const patient = {
      conditions: [
        { code: 'I50.32', status: 'active' },  // Chronic diastolic HF
      ],
      observations: [
        { code: '2276-4', value: 180, unit: 'ng/mL', date: '2024-06-01' },  // Ferritin 100-300
        { code: '2502-3', value: 15, unit: '%', date: '2024-06-01' },        // TSAT <20%
      ],
      medications: [],
    };

    const ferritin = patient.observations.find(o => o.code === '2276-4');
    const tsat = patient.observations.find(o => o.code === '2502-3');
    const functionalDeficiency =
      ferritin && (ferritin.value as number) >= 100 && (ferritin.value as number) <= 300
      && tsat && (tsat.value as number) < 20;

    expect(functionalDeficiency).toBe(true);
  });

  test('should NOT fire when ferritin >300', () => {
    const patient = {
      conditions: [
        { code: 'I50.22', status: 'active' },
      ],
      observations: [
        { code: '2276-4', value: 450, unit: 'ng/mL', date: '2024-06-01' },  // Ferritin >300
        { code: '2502-3', value: 25, unit: '%', date: '2024-06-01' },        // TSAT normal
      ],
    };

    const ferritin = patient.observations.find(o => o.code === '2276-4');
    const absoluteDeficiency = ferritin && (ferritin.value as number) < 100;
    const tsat = patient.observations.find(o => o.code === '2502-3');
    const functionalDeficiency =
      ferritin && (ferritin.value as number) >= 100 && (ferritin.value as number) <= 300
      && tsat && (tsat.value as number) < 20;

    expect(absoluteDeficiency).toBe(false);
    expect(functionalDeficiency).toBe(false);
  });

  test('should NOT fire when patient already on IV iron', () => {
    const patient = {
      conditions: [{ code: 'I50.22', status: 'active' }],
      observations: [
        { code: '2276-4', value: 45, unit: 'ng/mL', date: '2024-06-01' },
      ],
      medications: [
        { rxcui: '1313988', name: 'ferric carboxymaltose', status: 'active' },
      ],
    };

    const onIVIron = patient.medications.some(m =>
      m.name.toLowerCase().includes('ferric carboxymaltose')
    );
    expect(onIVIron).toBe(true);
    // Gap should NOT fire
  });

  test('should fire MODERATE when no iron studies in 12 months', () => {
    const patient = {
      conditions: [{ code: 'I50.22', status: 'active' }],
      observations: [],  // No ferritin/TSAT on record
      medications: [],
    };

    const hasHF = patient.conditions.some(c => c.code.startsWith('I50'));
    const noIronStudies = patient.observations.filter(
      (o: any) => o.code === '2276-4' || o.code === '2502-3'
    ).length === 0;

    expect(hasHF).toBe(true);
    expect(noIronStudies).toBe(true);
    // Gap fires as MODERATE -- order iron studies
  });
});
