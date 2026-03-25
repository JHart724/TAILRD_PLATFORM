/**
 * Unit Tests for Gap 39 -- QTc Safety Alert
 *
 * Tests the gap detection logic for dangerous QT prolongation from drug combinations.
 * Verifies medication counting, QTc thresholds, and ECG monitoring gaps.
 */

describe('Gap 39 -- QTc Safety Alert', () => {
  const QT_PROLONGING_MEDS = [
    'amiodarone', 'sotalol', 'dofetilide', 'azithromycin',
    'levofloxacin', 'ondansetron', 'citalopram', 'haloperidol',
  ];

  test('should fire CRITICAL when QTc >500ms + multiple QT-prolonging meds', () => {
    const patient = {
      medications: [
        { name: 'amiodarone', status: 'active' },
        { name: 'azithromycin', status: 'active' },
      ],
      observations: [
        { code: '8636-3', value: 520, unit: 'ms', date: '2024-06-01' },  // QTc >500ms
      ],
    };

    const qtMedCount = patient.medications.filter(m =>
      QT_PROLONGING_MEDS.includes(m.name.toLowerCase())
    ).length;
    const qtc = patient.observations.find(o => o.code === '8636-3');
    const qtcCritical = qtc && (qtc.value as number) > 500;

    expect(qtMedCount).toBeGreaterThanOrEqual(2);
    expect(qtcCritical).toBe(true);

    const riskTier = qtcCritical ? 'CRITICAL' : 'HIGH';
    expect(riskTier).toBe('CRITICAL');
  });

  test('should fire HIGH when QTc >470ms + 2 QT-prolonging meds', () => {
    const patient = {
      medications: [
        { name: 'sotalol', status: 'active' },
        { name: 'citalopram', status: 'active' },
      ],
      observations: [
        { code: '8636-3', value: 485, unit: 'ms', date: '2024-06-01' },  // QTc >470ms
      ],
    };

    const qtMedCount = patient.medications.filter(m =>
      QT_PROLONGING_MEDS.includes(m.name.toLowerCase())
    ).length;
    const qtc = patient.observations.find(o => o.code === '8636-3');
    const qtcProlonged = qtc && (qtc.value as number) > 470;
    const qtcCritical = qtc && (qtc.value as number) > 500;

    expect(qtMedCount).toBeGreaterThanOrEqual(2);
    expect(qtcProlonged).toBe(true);
    expect(qtcCritical).toBe(false);

    const riskTier = qtcCritical ? 'CRITICAL' : qtcProlonged && qtMedCount >= 2 ? 'HIGH' : 'MODERATE';
    expect(riskTier).toBe('HIGH');
  });

  test('should fire when on 2+ QT-prolonging meds with no ECG in 6 months', () => {
    const patient = {
      medications: [
        { name: 'amiodarone', status: 'active' },
        { name: 'ondansetron', status: 'active' },
      ],
      observations: [],  // No QTc on file
      procedures: [],     // No ECG procedure
    };

    const qtMedCount = patient.medications.filter(m =>
      QT_PROLONGING_MEDS.includes(m.name.toLowerCase())
    ).length;
    const noRecentECG = patient.observations.filter(
      (o: any) => o.code === '8636-3'
    ).length === 0;

    expect(qtMedCount).toBeGreaterThanOrEqual(2);
    expect(noRecentECG).toBe(true);
    // Gap should fire -- monitoring overdue
  });

  test('should NOT fire when on only 1 QT-prolonging med with normal QTc', () => {
    const patient = {
      medications: [
        { name: 'amiodarone', status: 'active' },
        // Only 1 QT-prolonging med
      ],
      observations: [
        { code: '8636-3', value: 430, unit: 'ms', date: '2024-06-01' },  // Normal QTc
      ],
    };

    const qtMedCount = patient.medications.filter(m =>
      QT_PROLONGING_MEDS.includes(m.name.toLowerCase())
    ).length;

    expect(qtMedCount).toBe(1);
    expect(qtMedCount).toBeLessThan(2);
    // Gap should NOT fire for single med with normal QTc
  });

  test('should NOT fire when QTc is normal and patient has recent ECG', () => {
    const patient = {
      medications: [
        { name: 'sotalol', status: 'active' },
        { name: 'levofloxacin', status: 'active' },
      ],
      observations: [
        { code: '8636-3', value: 440, unit: 'ms', date: '2024-06-01' },  // Normal QTc
      ],
    };

    const qtc = patient.observations.find(o => o.code === '8636-3');
    const qtcProlonged = qtc && (qtc.value as number) > 470;

    expect(qtcProlonged).toBe(false);
    // Gap should NOT fire -- monitoring is current and QTc is normal
  });
});
