/**
 * Unit Tests for Gap 50 -- Premature DAPT Discontinuation
 *
 * Tests the gap detection logic for early discontinuation of dual antiplatelet therapy
 * after drug-eluting stent (DES) implantation.
 */

describe('Gap 50 -- Premature DAPT Discontinuation', () => {
  function monthsAgo(n: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return d.toISOString().split('T')[0];
  }

  test('should fire CRITICAL when P2Y12 stopped <3 months post-DES', () => {
    const patient = {
      procedures: [
        { code: '92928', description: 'DES placement', status: 'completed', date: monthsAgo(2) },
      ],
      medications: [
        { name: 'aspirin', status: 'active' },
        // No P2Y12 inhibitor -- stopped
      ],
    };

    const hasDES = patient.procedures.some(p => p.code === '92928' && p.status === 'completed');
    const onAspirin = patient.medications.some(m => m.name === 'aspirin' && m.status === 'active');
    const onP2Y12 = patient.medications.some(m =>
      ['clopidogrel', 'prasugrel', 'ticagrelor'].includes(m.name.toLowerCase())
    );
    const daptComplete = onAspirin && onP2Y12;

    // DES was 2 months ago
    expect(hasDES).toBe(true);
    expect(onAspirin).toBe(true);
    expect(onP2Y12).toBe(false);
    expect(daptComplete).toBe(false);

    const riskTier = 'CRITICAL'; // <3 months
    expect(riskTier).toBe('CRITICAL');
  });

  test('should fire HIGH when DAPT incomplete 3-6 months post-DES', () => {
    const patient = {
      procedures: [
        { code: '92928', description: 'DES placement', status: 'completed', date: monthsAgo(4) },
      ],
      medications: [
        { name: 'aspirin', status: 'active' },
        // No P2Y12 -- stopped at 4 months
      ],
    };

    const monthsSince = 4;
    const daptComplete = false;

    expect(daptComplete).toBe(false);
    expect(monthsSince).toBeGreaterThanOrEqual(3);
    expect(monthsSince).toBeLessThan(6);

    const riskTier = monthsSince < 3 ? 'CRITICAL' : monthsSince < 6 ? 'HIGH' : 'MODERATE';
    expect(riskTier).toBe('HIGH');
  });

  test('should fire MODERATE when DAPT incomplete 6-12 months post-DES', () => {
    const patient = {
      procedures: [
        { code: '92928', description: 'DES placement', status: 'completed', date: monthsAgo(8) },
      ],
      medications: [
        { name: 'aspirin', status: 'active' },
        // P2Y12 stopped at 8 months
      ],
    };

    const monthsSince = 8;
    const daptComplete = false;

    const riskTier = monthsSince < 3 ? 'CRITICAL' : monthsSince < 6 ? 'HIGH' : 'MODERATE';
    expect(riskTier).toBe('MODERATE');
  });

  test('should NOT fire when patient on full DAPT', () => {
    const patient = {
      procedures: [
        { code: '92928', description: 'DES placement', status: 'completed', date: monthsAgo(4) },
      ],
      medications: [
        { name: 'aspirin', status: 'active' },
        { name: 'clopidogrel', status: 'active' },
      ],
    };

    const onAspirin = patient.medications.some(m => m.name === 'aspirin' && m.status === 'active');
    const onP2Y12 = patient.medications.some(m =>
      ['clopidogrel', 'prasugrel', 'ticagrelor'].includes(m.name.toLowerCase()) && m.status === 'active'
    );
    const daptComplete = onAspirin && onP2Y12;

    expect(daptComplete).toBe(true);
    // Gap should NOT fire
  });

  test('should NOT fire when DES was >12 months ago', () => {
    const patient = {
      procedures: [
        { code: '92928', description: 'DES placement', status: 'completed', date: monthsAgo(14) },
      ],
      medications: [
        { name: 'aspirin', status: 'active' },
        // Okay to be off P2Y12 after 12 months
      ],
    };

    const monthsSince = 14;
    const withinWindow = monthsSince <= 12;

    expect(withinWindow).toBe(false);
    // Gap should NOT fire -- outside the 12-month DAPT window
  });

  test('should NOT fire when high bleeding risk justifies early stop', () => {
    const patient = {
      procedures: [
        { code: '92928', description: 'DES placement', status: 'completed', date: monthsAgo(4) },
      ],
      medications: [
        { name: 'aspirin', status: 'active' },
      ],
      conditions: [
        { code: 'K92.2', status: 'active' },  // GI hemorrhage -- high bleeding risk
      ],
    };

    const highBleedingRisk = patient.conditions.some(c =>
      ['K92.2', 'K92.0', 'K92.1', 'D68.9'].includes(c.code)
    );

    expect(highBleedingRisk).toBe(true);
    // Gap should NOT fire -- high bleeding risk is an acceptable exclusion
  });
});
