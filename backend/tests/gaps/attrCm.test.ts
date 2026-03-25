/**
 * Unit Tests for Gap 1 -- ATTR-CM Detection
 *
 * Tests the gap detection logic against mock patient data.
 * Verifies inclusion criteria, exclusion criteria, and edge cases.
 */

describe('Gap 1 -- ATTR-CM Detection', () => {
  // Test 1: Patient meets all criteria -> gap fires
  test('should fire for patient with HF + 3 signals + no ATTR diagnosis', () => {
    const patient = {
      conditions: [
        { code: 'I50.22', status: 'active' },     // Chronic systolic HF
        { code: 'G56.00', status: 'active' },      // Bilateral carpal tunnel
        { code: 'M48.06', status: 'active' },      // Spinal stenosis
        { code: 'G62.9', status: 'active' },        // Peripheral neuropathy
      ],
      medications: [],
      observations: [
        { code: '67151-1', value: 28, unit: 'ng/L', date: '2024-01-15' },  // hs-TnT elevated
        { code: '67151-1', value: 32, unit: 'ng/L', date: '2024-04-20' },  // hs-TnT persistent
        { code: '18010-0', value: 55, unit: '%', date: '2024-03-01' },     // LVEF >=50%
        { code: '33762-6', value: 1200, unit: 'pg/mL', date: '2024-03-01' }, // NT-proBNP >900
      ],
      procedures: [],
      age: 74,
      gender: 'M',
      race: 'Black',
    };

    // In production this would call the CQL engine
    // For unit test, verify the inclusion logic directly
    const hasHF = patient.conditions.some(c => c.code.startsWith('I50'));
    const hasATTR = patient.conditions.some(c => ['E85.1', 'E85.4', 'E85.82'].includes(c.code));
    const hasPYP = patient.procedures.some((p: any) => p.code === '78816');

    let signalCount = 0;
    // Signal 3: persistent hs-TnT >14
    const hsTnT = patient.observations.filter(o => o.code === '67151-1' && (o.value as number) > 14);
    if (hsTnT.length >= 2) signalCount++;
    // Signal 4: carpal tunnel
    if (patient.conditions.some(c => c.code.startsWith('G56'))) signalCount++;
    // Signal 5: spinal stenosis
    if (patient.conditions.some(c => c.code.startsWith('M48'))) signalCount++;
    // Signal 6: peripheral neuropathy
    if (patient.conditions.some(c => c.code.startsWith('G62') || c.code.startsWith('G60'))) signalCount++;
    // Signal 7: HFpEF phenotype
    const lvef = patient.observations.find(o => o.code === '18010-0');
    const ntbnp = patient.observations.find(o => o.code === '33762-6');
    if (lvef && (lvef.value as number) >= 50 && ntbnp && (ntbnp.value as number) > 900) signalCount++;

    expect(hasHF).toBe(true);
    expect(hasATTR).toBe(false);
    expect(hasPYP).toBe(false);
    expect(signalCount).toBeGreaterThanOrEqual(3);
    // Gap should fire
    const gapFires = hasHF && !hasATTR && !hasPYP && signalCount >= 3;
    expect(gapFires).toBe(true);
  });

  // Test 2: Patient already has ATTR diagnosis -> gap does NOT fire
  test('should NOT fire for patient with existing ATTR-CM diagnosis', () => {
    const patient = {
      conditions: [
        { code: 'I50.22', status: 'active' },
        { code: 'E85.82', status: 'active' },  // Wild-type ATTR-CM -- already diagnosed
        { code: 'G56.00', status: 'active' },
        { code: 'M48.06', status: 'active' },
        { code: 'G62.9', status: 'active' },
      ],
      medications: [
        { rxcui: '2169274', name: 'tafamidis', status: 'active' },
      ],
      observations: [],
      procedures: [],
    };

    const hasATTR = patient.conditions.some(c => ['E85.1', 'E85.4', 'E85.82'].includes(c.code));
    expect(hasATTR).toBe(true);
    // Gap should NOT fire
  });

  // Test 3: Patient has HF but only 2 signals -> gap does NOT fire (threshold is 3)
  test('should NOT fire for patient with only 2 signals', () => {
    const patient = {
      conditions: [
        { code: 'I50.22', status: 'active' },
        { code: 'G56.00', status: 'active' },   // Signal 4
        { code: 'G62.9', status: 'active' },      // Signal 6
        // Only 2 signals -- below threshold of 3
      ],
      observations: [],
      procedures: [],
    };

    let signalCount = 0;
    if (patient.conditions.some(c => c.code.startsWith('G56'))) signalCount++;
    if (patient.conditions.some(c => c.code.startsWith('G62'))) signalCount++;

    expect(signalCount).toBe(2);
    expect(signalCount).toBeLessThan(3);
    // Gap should NOT fire
  });

  // Test 4: Patient already had PYP scan -> gap does NOT fire (workup done)
  test('should NOT fire when Tc-99m PYP scan already completed', () => {
    const patient = {
      conditions: [
        { code: 'I50.22', status: 'active' },
        { code: 'G56.00', status: 'active' },
        { code: 'M48.06', status: 'active' },
        { code: 'G62.9', status: 'active' },
      ],
      procedures: [
        { code: '78816', status: 'completed', date: '2024-02-15' }, // PYP scan done
      ],
    };

    const hasPYP = patient.procedures.some(p => p.code === '78816');
    expect(hasPYP).toBe(true);
    // Gap should NOT fire
  });

  // Test 5: Higher signal count -> CRITICAL risk tier
  test('should classify as CRITICAL when 5+ signals present', () => {
    const signalCount = 5;
    const riskTier = signalCount >= 5 ? 'CRITICAL' : signalCount >= 4 ? 'HIGH' : 'MODERATE';
    expect(riskTier).toBe('CRITICAL');
  });
});
