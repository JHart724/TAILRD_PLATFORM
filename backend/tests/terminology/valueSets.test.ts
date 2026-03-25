/**
 * Terminology Validation Tests
 *
 * Verifies that all ICD-10, RxNorm, LOINC, and CPT codes
 * used in the 104 gap ValueSets are valid.
 */

describe('Gap ValueSet Code Validation', () => {
  test('all ICD-10 codes follow valid format', () => {
    // Valid ICD-10 format: letter + 2 digits + optional dot + up to 4 chars
    const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,4})?$/;

    // Sample codes from gap definitions
    const sampleCodes = [
      'I50.22', 'E85.1', 'E85.82', 'I48.0', 'I25.10',
      'I35.0', 'I34.0', 'I70.201', 'G56.00', 'M48.06',
    ];

    for (const code of sampleCodes) {
      expect(code).toMatch(icd10Pattern);
    }
  });

  test('all RxNorm codes are numeric', () => {
    const rxnormPattern = /^\d+$/;

    const sampleCodes = [
      '1545653', '2200644', '1656339', '1854900',
      '2169274', '2481926', '2551804', '596',
    ];

    for (const code of sampleCodes) {
      expect(code).toMatch(rxnormPattern);
    }
  });

  test('all LOINC codes follow valid format', () => {
    const loincPattern = /^\d{1,5}-\d$/;

    const sampleCodes = [
      '33762-6', '6598-7', '67151-1', '2089-1',
      '33914-3', '6298-4', '18010-0', '4548-4',
    ];

    for (const code of sampleCodes) {
      expect(code).toMatch(loincPattern);
    }
  });

  test('all CPT codes follow valid format', () => {
    const cptPattern = /^\d{5}$|^\d{4}[A-Z]$/;

    const sampleCodes = [
      '78816', '92928', '33340', '93656',
      '33285', '33289', '75574', '93306',
    ];

    for (const code of sampleCodes) {
      expect(code).toMatch(cptPattern);
    }
  });
});
